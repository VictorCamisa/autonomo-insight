-- Create qualification levels configuration
CREATE TABLE public.qualification_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  level TEXT NOT NULL UNIQUE, -- 'Q1', 'Q2', 'Q3'
  name TEXT NOT NULL,
  description TEXT,
  required_fields JSONB NOT NULL DEFAULT '[]'::jsonb,
  optional_fields JSONB NOT NULL DEFAULT '[]'::jsonb,
  points_config JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.qualification_settings ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Anyone can view qualification settings"
ON public.qualification_settings FOR SELECT USING (true);

CREATE POLICY "Authenticated users can update settings"
ON public.qualification_settings FOR UPDATE USING (true);

-- Add current qualification level to system settings or use global config
-- Add qualification data fields to leads table
ALTER TABLE public.leads
ADD COLUMN IF NOT EXISTS qualification_level TEXT DEFAULT 'Q2',
ADD COLUMN IF NOT EXISTS qualification_data JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS qualification_score INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS qualification_status TEXT DEFAULT 'pending';

-- Insert default qualification levels
INSERT INTO public.qualification_settings (level, name, description, required_fields, optional_fields, points_config) VALUES
(
  'Q1',
  'Qualificação Rápida',
  'Coleta apenas dados essenciais para contato rápido',
  '["nome", "telefone", "veiculo_interesse"]'::jsonb,
  '[]'::jsonb,
  '{"nome": 30, "telefone": 40, "veiculo_interesse": 30}'::jsonb
),
(
  'Q2', 
  'Qualificação Padrão',
  'Coleta dados essenciais + origem e forma de pagamento',
  '["nome", "telefone", "veiculo_interesse", "origem", "forma_pagamento"]'::jsonb,
  '["veiculo_troca", "orcamento"]'::jsonb,
  '{"nome": 20, "telefone": 20, "veiculo_interesse": 25, "origem": 15, "forma_pagamento": 20, "veiculo_troca": 10, "orcamento": 10}'::jsonb
),
(
  'Q3',
  'Qualificação Completa', 
  'Coleta todos os dados possíveis do lead',
  '["nome", "telefone", "veiculo_interesse", "origem", "forma_pagamento", "orcamento", "entrada", "parcela"]'::jsonb,
  '["veiculo_troca", "cpf", "nome_limpo", "profissao", "renda"]'::jsonb,
  '{"nome": 10, "telefone": 10, "veiculo_interesse": 15, "origem": 10, "forma_pagamento": 15, "orcamento": 10, "entrada": 10, "parcela": 10, "veiculo_troca": 5, "cpf": 5, "nome_limpo": 5, "profissao": 3, "renda": 7}'::jsonb
);

-- Create global config for current qualification level
INSERT INTO public.qualification_settings (level, name, description, required_fields, optional_fields, points_config)
VALUES (
  'CURRENT',
  'Nível Atual',
  'Define qual nível de qualificação está ativo no momento',
  '["Q2"]'::jsonb, -- Current active level stored here
  '[]'::jsonb,
  '{}'::jsonb
)
ON CONFLICT (level) DO NOTHING;

-- Add trigger for updated_at
CREATE TRIGGER update_qualification_settings_updated_at
BEFORE UPDATE ON public.qualification_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add comments
COMMENT ON TABLE public.qualification_settings IS 'Configuration for lead qualification levels (Q1, Q2, Q3)';
COMMENT ON COLUMN public.leads.qualification_level IS 'Target qualification level for this lead';
COMMENT ON COLUMN public.leads.qualification_data IS 'JSON with collected qualification data';
COMMENT ON COLUMN public.leads.qualification_score IS 'Score based on collected data (0-100)';
COMMENT ON COLUMN public.leads.qualification_status IS 'Status: pending, partial, complete';