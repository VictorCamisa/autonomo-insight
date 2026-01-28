-- Adicionar coluna de categoria na tabela vehicle_images
ALTER TABLE public.vehicle_images 
ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'geral';

-- Adicionar comentário para documentação
COMMENT ON COLUMN public.vehicle_images.category IS 'Categoria da foto: geral, interior, exterior, frontal, traseira, lateral, motor, rodas, documentos';

-- Criar índice para busca por categoria
CREATE INDEX IF NOT EXISTS idx_vehicle_images_category ON public.vehicle_images(category);