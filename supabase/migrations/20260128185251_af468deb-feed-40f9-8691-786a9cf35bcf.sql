-- Corrigir a função search_similar_vehicles para usar o campo correto (year_model ao invés de year)
CREATE OR REPLACE FUNCTION public.search_similar_vehicles(
  query_embedding vector, 
  match_threshold double precision DEFAULT 0.7, 
  match_count integer DEFAULT 5, 
  year_tolerance integer DEFAULT 2, 
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