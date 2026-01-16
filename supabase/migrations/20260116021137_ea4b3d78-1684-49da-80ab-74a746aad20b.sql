-- Tabela para passos de follow-up (múltiplos passos por fluxo)
CREATE TABLE public.follow_up_steps (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  flow_id UUID NOT NULL REFERENCES public.follow_up_flows(id) ON DELETE CASCADE,
  step_order INTEGER NOT NULL DEFAULT 1,
  
  -- Timing simplificado
  delay_minutes INTEGER NOT NULL DEFAULT 5,
  
  -- Mensagem do passo
  message_template TEXT NOT NULL,
  
  -- Condição de parada (quando não executa este passo)
  stop_if_qualified BOOLEAN DEFAULT true,
  stop_if_assigned_to_salesperson BOOLEAN DEFAULT true,
  stop_if_responded BOOLEAN DEFAULT false,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Constraint para ordem única por fluxo
  UNIQUE(flow_id, step_order)
);

-- Índices
CREATE INDEX idx_follow_up_steps_flow_id ON public.follow_up_steps(flow_id);

-- Enable RLS
ALTER TABLE public.follow_up_steps ENABLE ROW LEVEL SECURITY;

-- RLS Policies (mesmas regras que follow_up_flows)
CREATE POLICY "Allow all for authenticated users"
  ON public.follow_up_steps
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Trigger para updated_at
CREATE TRIGGER update_follow_up_steps_updated_at
  BEFORE UPDATE ON public.follow_up_steps
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Migrar dados existentes: criar um passo para cada fluxo existente
INSERT INTO public.follow_up_steps (flow_id, step_order, delay_minutes, message_template, stop_if_qualified, stop_if_assigned_to_salesperson)
SELECT 
  id,
  1,
  COALESCE(delay_days * 1440 + delay_hours * 60, 60),
  message_template,
  true,
  true
FROM public.follow_up_flows
WHERE message_template IS NOT NULL AND message_template != '';