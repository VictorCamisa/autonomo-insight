-- Adiciona colunas faltantes na tabela vehicle_transactions
ALTER TABLE public.vehicle_transactions 
ADD COLUMN IF NOT EXISTS year text,
ADD COLUMN IF NOT EXISTS color text,
ADD COLUMN IF NOT EXISTS observations text,
ADD COLUMN IF NOT EXISTS seller_rg text,
ADD COLUMN IF NOT EXISTS seller_birth date,
ADD COLUMN IF NOT EXISTS buyer_rg text,
ADD COLUMN IF NOT EXISTS buyer_birth date;

-- Limpa dados anteriores para reimportar
DELETE FROM vehicle_transactions;