-- Tabela para configurações de automação de follow-up
CREATE TABLE public.follow_up_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  automation_enabled BOOLEAN NOT NULL DEFAULT false,
  interval_minutes INTEGER NOT NULL DEFAULT 5,
  last_execution_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id)
);

-- Inserir configuração padrão (automação desligada)
INSERT INTO public.follow_up_settings (automation_enabled, interval_minutes)
VALUES (false, 5);

-- RLS
ALTER TABLE public.follow_up_settings ENABLE ROW LEVEL SECURITY;

-- Permitir leitura para usuários autenticados
CREATE POLICY "Authenticated users can read settings" 
ON public.follow_up_settings 
FOR SELECT 
USING (auth.role() = 'authenticated');

-- Permitir atualização para usuários autenticados (managers podem alterar)
CREATE POLICY "Authenticated users can update settings" 
ON public.follow_up_settings 
FOR UPDATE 
USING (auth.role() = 'authenticated');

-- Trigger para atualizar updated_at
CREATE TRIGGER update_follow_up_settings_updated_at
BEFORE UPDATE ON public.follow_up_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();