-- Remover fotos duplicadas, mantendo apenas a mais antiga por created_at
DELETE FROM vehicle_images a
USING vehicle_images b
WHERE a.vehicle_id = b.vehicle_id
  AND a.image_url = b.image_url
  AND a.created_at > b.created_at;

-- Criar índice único para prevenir duplicatas futuras
CREATE UNIQUE INDEX IF NOT EXISTS idx_vehicle_images_unique_url 
ON vehicle_images(vehicle_id, image_url);