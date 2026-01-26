-- =====================================================
-- FASE 1 - PARTE 1: Adicionar novos valores ao enum
-- =====================================================

-- 1. Adicionar novos valores ao enum negotiation_status
ALTER TYPE negotiation_status ADD VALUE IF NOT EXISTS 'atendimento_ia';
ALTER TYPE negotiation_status ADD VALUE IF NOT EXISTS 'follow_up';

-- 2. Adicionar coluna para tracking de última mensagem na negociação
ALTER TABLE negotiations 
ADD COLUMN IF NOT EXISTS last_message_at TIMESTAMPTZ DEFAULT now();