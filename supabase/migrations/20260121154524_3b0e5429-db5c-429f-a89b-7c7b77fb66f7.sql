-- Adiciona campos extras na tabela customers
ALTER TABLE public.customers 
ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'manual',
ADD COLUMN IF NOT EXISTS renavam TEXT,
ADD COLUMN IF NOT EXISTS rg TEXT;

-- Adiciona colunas de vínculo com clientes na tabela vehicle_transactions
ALTER TABLE public.vehicle_transactions 
ADD COLUMN IF NOT EXISTS seller_customer_id UUID REFERENCES public.customers(id),
ADD COLUMN IF NOT EXISTS buyer_customer_id UUID REFERENCES public.customers(id);

-- Índices para busca
CREATE INDEX IF NOT EXISTS idx_vehicle_transactions_seller_customer ON public.vehicle_transactions(seller_customer_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_transactions_buyer_customer ON public.vehicle_transactions(buyer_customer_id);
CREATE INDEX IF NOT EXISTS idx_customers_source ON public.customers(source);