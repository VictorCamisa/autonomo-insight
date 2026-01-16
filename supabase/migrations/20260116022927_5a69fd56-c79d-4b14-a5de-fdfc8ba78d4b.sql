-- Tabela para rastrear execução de passos por lead
CREATE TABLE public.follow_up_step_executions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  flow_id UUID NOT NULL REFERENCES public.follow_up_flows(id) ON DELETE CASCADE,
  step_id UUID NOT NULL REFERENCES public.follow_up_steps(id) ON DELETE CASCADE,
  step_order INTEGER NOT NULL,
  executed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  message_sent TEXT,
  whatsapp_instance_id UUID REFERENCES public.whatsapp_instances(id),
  status TEXT DEFAULT 'sent', -- 'sent', 'failed', 'skipped'
  error_message TEXT,
  
  -- Evita executar o mesmo passo duas vezes para o mesmo lead
  UNIQUE(lead_id, flow_id, step_id)
);

-- Índices para consultas rápidas
CREATE INDEX idx_step_executions_lead ON public.follow_up_step_executions(lead_id);
CREATE INDEX idx_step_executions_flow ON public.follow_up_step_executions(flow_id);
CREATE INDEX idx_step_executions_executed_at ON public.follow_up_step_executions(executed_at);

-- RLS
ALTER TABLE public.follow_up_step_executions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access for authenticated users"
ON public.follow_up_step_executions
FOR ALL
USING (true)
WITH CHECK (true);

-- Adicionar coluna para configurar instância WhatsApp no fluxo
ALTER TABLE public.follow_up_flows 
ADD COLUMN IF NOT EXISTS whatsapp_instance_id UUID REFERENCES public.whatsapp_instances(id);

-- Adicionar coluna para última verificação de follow-up em leads
ALTER TABLE public.leads 
ADD COLUMN IF NOT EXISTS last_follow_up_check TIMESTAMP WITH TIME ZONE;

-- Função para verificar se lead respondeu (tem mensagem incoming após última execução)
CREATE OR REPLACE FUNCTION public.lead_has_responded_since(p_lead_id UUID, p_since TIMESTAMP WITH TIME ZONE)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  has_response BOOLEAN;
BEGIN
  SELECT EXISTS(
    SELECT 1 FROM whatsapp_messages wm
    JOIN whatsapp_contacts wc ON wc.id = wm.contact_id
    WHERE wc.lead_id = p_lead_id
    AND wm.direction = 'incoming'
    AND wm.created_at > p_since
  ) INTO has_response;
  
  RETURN has_response;
END;
$$;