-- Create ai_agent_knowledge table for RAG/Knowledge Base
CREATE TABLE public.ai_agent_knowledge (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES public.ai_agents(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'custom',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ai_agent_knowledge ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view agent knowledge"
ON public.ai_agent_knowledge
FOR SELECT
USING (true);

CREATE POLICY "Users can create agent knowledge"
ON public.ai_agent_knowledge
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Users can update agent knowledge"
ON public.ai_agent_knowledge
FOR UPDATE
USING (true);

CREATE POLICY "Users can delete agent knowledge"
ON public.ai_agent_knowledge
FOR DELETE
USING (true);

-- Create index for faster queries
CREATE INDEX idx_ai_agent_knowledge_agent_id ON public.ai_agent_knowledge(agent_id);
CREATE INDEX idx_ai_agent_knowledge_active ON public.ai_agent_knowledge(agent_id, is_active);

-- Add trigger for updated_at
CREATE TRIGGER update_ai_agent_knowledge_updated_at
BEFORE UPDATE ON public.ai_agent_knowledge
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add new columns to ai_agents for identity configuration
ALTER TABLE public.ai_agents
ADD COLUMN IF NOT EXISTS display_name TEXT,
ADD COLUMN IF NOT EXISTS gender TEXT DEFAULT 'female',
ADD COLUMN IF NOT EXISTS tone TEXT DEFAULT 'friendly',
ADD COLUMN IF NOT EXISTS welcome_message TEXT,
ADD COLUMN IF NOT EXISTS special_instructions JSONB DEFAULT '{}'::jsonb;

-- Comment on columns for documentation
COMMENT ON TABLE public.ai_agent_knowledge IS 'Knowledge base entries for AI agents (RAG)';
COMMENT ON COLUMN public.ai_agent_knowledge.category IS 'Category: faq, policies, scripts, about, custom';
COMMENT ON COLUMN public.ai_agents.display_name IS 'Name the agent uses to introduce itself';
COMMENT ON COLUMN public.ai_agents.gender IS 'Gender for language: male, female, neutral';
COMMENT ON COLUMN public.ai_agents.tone IS 'Tone of voice: formal, informal, friendly, professional';
COMMENT ON COLUMN public.ai_agents.welcome_message IS 'Custom welcome message';
COMMENT ON COLUMN public.ai_agents.special_instructions IS 'JSON with special rules like brevity, emojis, photo rules';