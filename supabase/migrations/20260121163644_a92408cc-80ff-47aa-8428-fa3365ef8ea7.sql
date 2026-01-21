-- Create contracts table
CREATE TABLE public.contracts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contract_number TEXT NOT NULL UNIQUE,
  contract_type TEXT NOT NULL CHECK (contract_type IN ('venda', 'compra')),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'pending', 'signed', 'cancelled')),
  
  -- Customer/Client data
  customer_id UUID REFERENCES public.customers(id),
  customer_name TEXT NOT NULL,
  customer_nationality TEXT,
  customer_profession TEXT,
  customer_marital_status TEXT,
  customer_rg TEXT,
  customer_cpf TEXT,
  customer_birth_date DATE,
  customer_address TEXT,
  customer_city TEXT,
  customer_state TEXT,
  customer_zip TEXT,
  customer_phone TEXT,
  customer_email TEXT,
  
  -- Vehicle data
  vehicle_id UUID,
  vehicle_brand TEXT NOT NULL,
  vehicle_model TEXT NOT NULL,
  vehicle_year TEXT NOT NULL,
  vehicle_plate TEXT,
  vehicle_color TEXT,
  vehicle_renavam TEXT,
  vehicle_odometer INTEGER,
  vehicle_value DECIMAL(12, 2) NOT NULL,
  
  -- Trade-in vehicle (for sales)
  trade_in_brand TEXT,
  trade_in_model TEXT,
  trade_in_year TEXT,
  trade_in_plate TEXT,
  trade_in_color TEXT,
  trade_in_renavam TEXT,
  trade_in_value DECIMAL(12, 2),
  
  -- Payment details (for sales)
  down_payment DECIMAL(12, 2) DEFAULT 0,
  installments_count INTEGER DEFAULT 0,
  installment_value DECIMAL(12, 2) DEFAULT 0,
  installment_due_day INTEGER,
  
  -- Metadata
  notes TEXT,
  signed_at TIMESTAMP WITH TIME ZONE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view all contracts" 
ON public.contracts 
FOR SELECT 
USING (true);

CREATE POLICY "Users can create contracts" 
ON public.contracts 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Users can update contracts" 
ON public.contracts 
FOR UPDATE 
USING (true);

CREATE POLICY "Users can delete contracts" 
ON public.contracts 
FOR DELETE 
USING (true);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_contracts_updated_at
BEFORE UPDATE ON public.contracts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create sequence for contract numbers
CREATE SEQUENCE IF NOT EXISTS contract_number_seq START 1;

-- Function to generate contract number
CREATE OR REPLACE FUNCTION generate_contract_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.contract_number IS NULL OR NEW.contract_number = '' THEN
    NEW.contract_number := 'CONT-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(nextval('contract_number_seq')::TEXT, 4, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-generate contract number
CREATE TRIGGER generate_contract_number_trigger
BEFORE INSERT ON public.contracts
FOR EACH ROW
EXECUTE FUNCTION generate_contract_number();