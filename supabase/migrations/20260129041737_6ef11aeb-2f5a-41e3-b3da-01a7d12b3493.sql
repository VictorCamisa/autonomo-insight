-- Atualizar a função de busca de veículos para ser menos restritiva
CREATE OR REPLACE FUNCTION public.search_similar_vehicles(
  query_embedding vector, 
  match_threshold double precision DEFAULT 0.3, -- Era 0.7, agora 0.3
  match_count integer DEFAULT 15,               -- Era 5, agora 15
  year_tolerance integer DEFAULT 3,             -- Era 2, agora 3
  target_year integer DEFAULT NULL::integer
)
RETURNS TABLE(vehicle_id uuid, similarity double precision, search_text text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    ve.vehicle_id,
    1 - (ve.embedding <=> query_embedding) AS similarity,
    ve.search_text
  FROM vehicle_embeddings ve
  JOIN vehicles v ON v.id = ve.vehicle_id
  WHERE 
    v.status = 'disponivel'
    AND 1 - (ve.embedding <=> query_embedding) > match_threshold
    AND (target_year IS NULL OR ABS(v.year_model - target_year) <= year_tolerance)
  ORDER BY ve.embedding <=> query_embedding
  LIMIT match_count;
END;
$function$;