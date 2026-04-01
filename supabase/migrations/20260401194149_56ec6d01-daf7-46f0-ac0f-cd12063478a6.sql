
-- 1. Move negociação com status obsoleto 'proposta_enviada' para 'negociando'
UPDATE negotiations SET status = 'negociando', updated_at = now() WHERE status = 'proposta_enviada';

-- 2. Move negociações em follow_up há mais de 30 dias para 'perdido'
UPDATE negotiations SET status = 'perdido', updated_at = now() WHERE status = 'follow_up' AND updated_at < now() - interval '30 days';

-- 3. Desativar o fluxo "Follow up - Primeiro atendimento" que conflita com a IA
UPDATE follow_up_flows SET is_active = false, updated_at = now() WHERE id = 'a05b804e-87dd-47ad-af0f-a4e204f5d980';

-- 4. Cancelar follow-up trackings ativos associados a negociações que acabaram de ser movidas para 'perdido'
UPDATE lead_follow_up_tracking SET status = 'completed', updated_at = now() 
WHERE status = 'active' AND negotiation_id IN (
  SELECT id FROM negotiations WHERE status = 'perdido' AND updated_at > now() - interval '1 minute'
);
