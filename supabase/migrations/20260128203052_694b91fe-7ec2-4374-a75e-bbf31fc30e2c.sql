-- Corrigir configurações da IA Gabi para maior consistência
UPDATE ai_agents 
SET 
  temperature = 0.25,           -- Reduzir de 0.6 para 0.25 (muito mais previsível)
  context_window_size = 20,     -- Aumentar de 10 para 20 mensagens
  updated_at = now()
WHERE id = '76591590-0f88-4594-a518-f02b7c5eff8e';

-- Adicionar conhecimento base sobre a loja (para garantir que nunca use placeholders)
INSERT INTO ai_agent_knowledge (agent_id, title, content, category, is_active)
VALUES 
(
  '76591590-0f88-4594-a518-f02b7c5eff8e',
  'Informações da Loja',
  'A loja Matheus Veículos fica na Avenida Major Joaquim Monteiro Patto, 25, Jardim Monção - Jaguariúna/SP. Telefone: (12) 98897-3547. Horário de funcionamento: Segunda a Sexta das 9h às 18h, Sábados das 9h às 13h. NUNCA use placeholders como [endereço] ou [telefone] - sempre forneça as informações completas.',
  'store_info',
  true
),
(
  '76591590-0f88-4594-a518-f02b7c5eff8e',
  'Regras de Estoque',
  'A loja possui mais de 50 veículos em estoque. Quando sugerir carros, NUNCA diga "só temos esses" porque existem MUITOS outros veículos além dos mencionados. Se o cliente perguntar quantos carros temos, responda "temos mais de 50 veículos disponíveis".',
  'inventory_rules',
  true
),
(
  '76591590-0f88-4594-a518-f02b7c5eff8e',
  'Regras de Fotos',
  'Quando enviar fotos, envie APENAS a tag [ENVIAR_FOTO: URL] sem texto introdutório. NÃO diga "Aqui estão as fotos" ou "Vou enviar as fotos". NUNCA envie foto de um veículo diferente do pedido pelo cliente.',
  'photo_rules',
  true
)
ON CONFLICT DO NOTHING;