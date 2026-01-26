-- =====================================================
-- FASE 1 - PARTE 2: Tabela de tracking e funções
-- =====================================================

-- 1. Criar tabela de tracking de follow-up por lead
CREATE TABLE IF NOT EXISTS lead_follow_up_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
  negotiation_id UUID REFERENCES negotiations(id) ON DELETE CASCADE,
  flow_id UUID REFERENCES follow_up_flows(id) ON DELETE SET NULL,
  current_step INT DEFAULT 0,
  started_at TIMESTAMPTZ DEFAULT now(),
  last_step_at TIMESTAMPTZ,
  next_step_at TIMESTAMPTZ,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'reactivated', 'expired', 'paused')),
  reactivated_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Índices para performance
CREATE INDEX IF NOT EXISTS idx_follow_up_tracking_lead ON lead_follow_up_tracking(lead_id);
CREATE INDEX IF NOT EXISTS idx_follow_up_tracking_negotiation ON lead_follow_up_tracking(negotiation_id);
CREATE INDEX IF NOT EXISTS idx_follow_up_tracking_status ON lead_follow_up_tracking(status);
CREATE INDEX IF NOT EXISTS idx_follow_up_tracking_next_step ON lead_follow_up_tracking(next_step_at) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_negotiations_last_message ON negotiations(last_message_at);

-- 3. Habilitar RLS na nova tabela
ALTER TABLE lead_follow_up_tracking ENABLE ROW LEVEL SECURITY;

-- 4. Políticas RLS para lead_follow_up_tracking
CREATE POLICY "Authenticated users can view follow-up tracking"
  ON lead_follow_up_tracking FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert follow-up tracking"
  ON lead_follow_up_tracking FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update follow-up tracking"
  ON lead_follow_up_tracking FOR UPDATE
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete follow-up tracking"
  ON lead_follow_up_tracking FOR DELETE
  USING (auth.role() = 'authenticated');

-- 5. Trigger para atualizar updated_at
CREATE TRIGGER update_lead_follow_up_tracking_updated_at
  BEFORE UPDATE ON lead_follow_up_tracking
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 6. Função para resetar follow-up quando lead responde
CREATE OR REPLACE FUNCTION reset_follow_up_on_lead_response()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_negotiation_id UUID;
BEGIN
  -- Se é uma mensagem incoming (do lead)
  IF NEW.direction = 'incoming' THEN
    -- Busca o lead_id pelo contato e encontra negociações ativas em follow_up
    SELECT n.id INTO v_negotiation_id
    FROM negotiations n
    JOIN leads l ON l.id = n.lead_id
    JOIN whatsapp_contacts wc ON wc.lead_id = l.id
    WHERE wc.id = NEW.contact_id
      AND n.status = 'follow_up'
    ORDER BY n.updated_at DESC
    LIMIT 1;
    
    IF v_negotiation_id IS NOT NULL THEN
      -- Move a negociação de volta para atendimento_ia
      UPDATE negotiations 
      SET status = 'atendimento_ia',
          last_message_at = NEW.created_at,
          updated_at = now()
      WHERE id = v_negotiation_id;
      
      -- Marca o tracking como reativado
      UPDATE lead_follow_up_tracking
      SET status = 'reactivated',
          reactivated_count = reactivated_count + 1,
          updated_at = now()
      WHERE negotiation_id = v_negotiation_id
        AND status = 'active';
    ELSE
      -- Atualiza last_message_at em qualquer negociação ativa do lead
      UPDATE negotiations n
      SET last_message_at = NEW.created_at,
          updated_at = now()
      FROM leads l
      JOIN whatsapp_contacts wc ON wc.lead_id = l.id
      WHERE wc.id = NEW.contact_id
        AND n.lead_id = l.id
        AND n.status NOT IN ('ganho', 'perdido');
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- 7. Trigger para chamar a função quando mensagem chega
DROP TRIGGER IF EXISTS trigger_reset_follow_up_on_response ON whatsapp_messages;
CREATE TRIGGER trigger_reset_follow_up_on_response
  AFTER INSERT ON whatsapp_messages
  FOR EACH ROW
  EXECUTE FUNCTION reset_follow_up_on_lead_response();

-- 8. Função para mover negociações para follow-up após 24h sem resposta
CREATE OR REPLACE FUNCTION move_stale_negotiations_to_follow_up()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Move negociações que estão em 'negociando' há mais de 24h sem mensagem
  UPDATE negotiations
  SET status = 'follow_up',
      updated_at = now()
  WHERE status = 'negociando'
    AND last_message_at < now() - INTERVAL '24 hours';
END;
$$;

-- 9. Migrar negociações existentes para novos status (mapeamento)
UPDATE negotiations 
SET status = 'negociando'
WHERE status IN ('em_andamento', 'proposta_enviada');

UPDATE negotiations 
SET status = 'follow_up'
WHERE status = 'pausado';