
-- 1. Pause orphan trackings for leads currently in atendimento_ia
UPDATE lead_follow_up_tracking 
SET status = 'paused', updated_at = now() 
WHERE status = 'active' 
  AND negotiation_id IN (SELECT id FROM negotiations WHERE status = 'atendimento_ia');

-- 2. Deactivate the "Primeiro atendimento" flow that targets atendimento_ia
UPDATE follow_up_flows 
SET is_active = false, updated_at = now() 
WHERE id = 'a05b804e-87dd-47ad-af0f-a4e204f5d980';

-- 3. Activate "Primeira semana" flow for the 743 leads stuck in follow_up
UPDATE follow_up_flows 
SET is_active = true, updated_at = now() 
WHERE id = '2601b48b-9c93-4e46-92d9-150fef4fd8d9';
