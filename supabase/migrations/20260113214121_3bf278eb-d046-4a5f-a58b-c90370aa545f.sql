-- Criar tabela para rastrear dados de qualificação coletados pelo bot
CREATE TABLE public.lead_qualification_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES public.leads(id) ON DELETE CASCADE UNIQUE,
  vehicle_interest TEXT,
  budget NUMERIC,
  desired_installment NUMERIC,
  down_payment NUMERIC,
  has_trade_in BOOLEAN,
  trade_in_vehicle TEXT,
  clean_credit BOOLEAN,
  cpf TEXT,
  additional_info JSONB DEFAULT '{}',
  is_qualified BOOLEAN DEFAULT FALSE,
  qualified_at TIMESTAMPTZ,
  message_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Habilitar RLS
ALTER TABLE public.lead_qualification_data ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Users can view lead qualification data"
ON public.lead_qualification_data FOR SELECT
USING (true);

CREATE POLICY "Users can insert lead qualification data"
ON public.lead_qualification_data FOR INSERT
WITH CHECK (true);

CREATE POLICY "Users can update lead qualification data"
ON public.lead_qualification_data FOR UPDATE
USING (true);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_lead_qualification_data_updated_at
BEFORE UPDATE ON public.lead_qualification_data
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Índice para busca rápida por lead_id
CREATE INDEX idx_lead_qualification_data_lead_id ON public.lead_qualification_data(lead_id);
CREATE INDEX idx_lead_qualification_data_is_qualified ON public.lead_qualification_data(is_qualified);