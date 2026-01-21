-- Tabela para histórico de transações de veículos (compra e venda)
CREATE TABLE public.vehicle_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  vehicle_number INTEGER,
  brand TEXT,
  model TEXT,
  plate TEXT,
  renavam TEXT,
  chassis TEXT,
  
  -- Dados do vendedor (de quem compramos)
  seller_name TEXT,
  seller_phone TEXT,
  seller_cpf TEXT,
  seller_address TEXT,
  purchase_date DATE,
  purchase_price NUMERIC(12,2),
  
  -- Dados do comprador (para quem vendemos)
  buyer_name TEXT,
  buyer_phone TEXT,
  buyer_cpf TEXT,
  buyer_address TEXT,
  sale_date DATE,
  sale_price NUMERIC(12,2),
  km_out INTEGER,
  
  -- Metadados
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.vehicle_transactions ENABLE ROW LEVEL SECURITY;

-- Políticas de acesso (usuários autenticados podem ver e gerenciar)
CREATE POLICY "Authenticated users can view vehicle transactions" 
ON public.vehicle_transactions 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert vehicle transactions" 
ON public.vehicle_transactions 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update vehicle transactions" 
ON public.vehicle_transactions 
FOR UPDATE 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete vehicle transactions" 
ON public.vehicle_transactions 
FOR DELETE 
USING (auth.uid() IS NOT NULL);

-- Trigger para updated_at
CREATE TRIGGER update_vehicle_transactions_updated_at
BEFORE UPDATE ON public.vehicle_transactions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Índices para busca
CREATE INDEX idx_vehicle_transactions_plate ON public.vehicle_transactions(plate);
CREATE INDEX idx_vehicle_transactions_seller_name ON public.vehicle_transactions(seller_name);
CREATE INDEX idx_vehicle_transactions_buyer_name ON public.vehicle_transactions(buyer_name);
CREATE INDEX idx_vehicle_transactions_purchase_date ON public.vehicle_transactions(purchase_date);
CREATE INDEX idx_vehicle_transactions_sale_date ON public.vehicle_transactions(sale_date);