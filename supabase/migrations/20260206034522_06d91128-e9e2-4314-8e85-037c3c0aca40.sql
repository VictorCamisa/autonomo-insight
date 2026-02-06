-- Add vehicle_type column to differentiate between cars and motorcycles
ALTER TABLE public.vehicles 
ADD COLUMN vehicle_type text NOT NULL DEFAULT 'carro';

-- Add constraint to ensure only valid values
ALTER TABLE public.vehicles
ADD CONSTRAINT vehicles_vehicle_type_check 
CHECK (vehicle_type IN ('carro', 'moto'));

-- Add index for better filtering performance
CREATE INDEX idx_vehicles_vehicle_type ON public.vehicles(vehicle_type);

-- Update comment
COMMENT ON COLUMN public.vehicles.vehicle_type IS 'Vehicle type: carro (car) or moto (motorcycle)';