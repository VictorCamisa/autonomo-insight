import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

    const body = await req.json();
    const { 
      query, 
      max_results = 5, 
      year_tolerance = 2,
      price_tolerance_percent = 20,
      target_year = null,
      max_price = null 
    } = body;

    console.log('[RAG Search] Query:', query, '| Max results:', max_results, '| Year tolerance:', year_tolerance);

    if (!query || typeof query !== 'string') {
      return new Response(JSON.stringify({ 
        error: 'Query is required',
        vehicles: [] 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Extract year from query if present
    const yearMatch = query.match(/\b(19|20)\d{2}\b/);
    const extractedYear = yearMatch ? parseInt(yearMatch[0]) : null;
    const effectiveTargetYear = target_year || extractedYear;

    // Extract price from query if present
    const pricePatterns = [
      /(?:até|ate|max|máximo|maximo)\s*(?:R\$\s*)?(\d+(?:\.\d{3})*(?:,\d{2})?|\d+)\s*(?:mil|k)?/i,
      /(?:R\$\s*)?(\d+(?:\.\d{3})*(?:,\d{2})?|\d+)\s*(?:mil|k)/i,
    ];
    
    let extractedMaxPrice: number | null = null;
    for (const pattern of pricePatterns) {
      const priceMatch = query.match(pattern);
      if (priceMatch) {
        let priceStr = priceMatch[1].replace(/\./g, '').replace(',', '.');
        let price = parseFloat(priceStr);
        if (query.toLowerCase().includes('mil') || query.toLowerCase().includes('k')) {
          price *= 1000;
        }
        extractedMaxPrice = price;
        break;
      }
    }
    const effectiveMaxPrice = max_price || extractedMaxPrice;

    console.log('[RAG Search] Extracted - Year:', effectiveTargetYear, 'Max Price:', effectiveMaxPrice);

    // Use text-based search since Lovable AI doesn't support embeddings
    return await smartTextSearch(
      supabase, 
      LOVABLE_API_KEY,
      query, 
      max_results, 
      effectiveTargetYear, 
      year_tolerance, 
      effectiveMaxPrice,
      price_tolerance_percent
    );

  } catch (error) {
    console.error('[RAG Search] Error:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error',
      vehicles: []
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

// Smart text search with keyword extraction and scoring
async function smartTextSearch(
  supabase: any,
  apiKey: string | undefined,
  query: string,
  maxResults: number,
  targetYear: number | null,
  yearTolerance: number,
  maxPrice: number | null,
  priceTolerance: number
): Promise<Response> {
  console.log('[RAG Search] Using smart text search');

  // Get all search texts from vehicle_embeddings
  const { data: embeddings, error: embError } = await supabase
    .from('vehicle_embeddings')
    .select('vehicle_id, search_text');

  if (embError) {
    console.error('[RAG Search] Error fetching embeddings:', embError);
  }

  // Build search text map
  const searchTextMap = new Map<string, string>();
  if (embeddings) {
    for (const emb of embeddings) {
      searchTextMap.set(emb.vehicle_id, emb.search_text || '');
    }
  }

  // Build base query for vehicles
  let vehicleQuery = supabase
    .from('vehicles')
    .select('id, brand, model, version, year_fabrication, year_model, sale_price, km, color, fuel_type, transmission, images, status')
    .eq('status', 'disponivel');

  // Apply year filter with tolerance if specified
  if (targetYear) {
    vehicleQuery = vehicleQuery
      .gte('year_model', targetYear - yearTolerance)
      .lte('year_model', targetYear + yearTolerance);
  }

  // Apply price filter with tolerance
  if (maxPrice) {
    const maxWithTolerance = maxPrice * (1 + priceTolerance / 100);
    vehicleQuery = vehicleQuery.lte('sale_price', maxWithTolerance);
  }

  const { data: allVehicles, error } = await vehicleQuery.limit(100);

  if (error) {
    return new Response(JSON.stringify({ 
      error: error.message,
      vehicles: []
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // EXPANDED: Stop words + normalize keywords more aggressively
  const stopWords = ['que', 'para', 'com', 'sem', 'até', 'ate', 'mil', 'carro', 'veículo', 'veiculo', 
    'procuro', 'quero', 'busco', 'tem', 'tenho', 'interesse', 'um', 'uma', 'dos', 'das', 'de', 'do', 'da',
    'isso', 'esse', 'essa', 'este', 'esta', 'voces', 'vocês', 'ainda', 'vendeu', 'sobre', 'qual', 'quais',
    'como', 'onde', 'quando', 'porque', 'por', 'mais', 'menos', 'muito', 'pouco', 'algum', 'alguma', 'nenhum',
    'seria', 'seria', 'poderia', 'pode', 'posso', 'consigo', 'gostaria', 'queria', 'preciso', 'precisa',
    'ola', 'olá', 'oi', 'bom', 'boa', 'dia', 'tarde', 'noite', 'obrigado', 'obrigada', 'valeu'];
  const keywords = query.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // Remove acentos
    .replace(/[^\w\s]/g, ' ') // Remove pontuação
    .split(/\s+/)
    .filter(k => k.length > 1 && !stopWords.includes(k));

  console.log('[RAG Search] Keywords:', keywords);

  // Score vehicles based on keyword matches
  const scoredVehicles = (allVehicles || []).map((v: any) => {
    const searchText = searchTextMap.get(v.id) || `${v.brand} ${v.model} ${v.version || ''} ${v.year_model || v.year_fabrication || ''}`;
    const vehicleText = searchText.toLowerCase();
    let score = 0;
    let matchedKeywords: string[] = [];

    // Keyword matching with weighted scoring
    for (const keyword of keywords) {
      if (vehicleText.includes(keyword)) {
        // Brand/model matches are more important
        if (v.brand?.toLowerCase().includes(keyword) || v.model?.toLowerCase().includes(keyword)) {
          score += 25;
        } else if (v.version?.toLowerCase().includes(keyword)) {
          score += 15;
        } else {
          score += 10;
        }
        matchedKeywords.push(keyword);
      }
    }

    // Year proximity bonus
    if (targetYear && (v.year_model || v.year_fabrication)) {
      const vehicleYear = v.year_model || v.year_fabrication;
      const yearDiff = Math.abs(vehicleYear - targetYear);
      if (yearDiff === 0) {
        score += 30; // Exact match bonus
      } else if (yearDiff <= yearTolerance) {
        score += 15 - yearDiff * 5;
      }
    }

    // Price within budget bonus
    if (maxPrice && v.sale_price) {
      if (v.sale_price <= maxPrice) {
        score += 20; // Within budget bonus
      } else if (v.sale_price <= maxPrice * 1.1) {
        score += 10; // Slightly over budget
      }
    }

    // Extract photo URL from search text
    let photoUrl = null;
    const photoMatch = searchText.match(/foto:(https?:\/\/[^\s]+)/);
    if (photoMatch) {
      photoUrl = photoMatch[1];
    } else if (v.images && Array.isArray(v.images) && v.images.length > 0) {
      photoUrl = v.images[0];
    }

    return { 
      ...v, 
      similarity: score / 100, // Normalize to 0-1 range
      matched_keywords: matchedKeywords,
      photo_url: photoUrl
    };
  });

  // Filter vehicles with at least some match and sort
  const results = scoredVehicles
    .filter((v: any) => v.similarity > 0)
    .sort((a: any, b: any) => b.similarity - a.similarity)
    .slice(0, maxResults);

  // If no results with keywords, return top vehicles by other criteria
  if (results.length === 0 && (targetYear || maxPrice)) {
    console.log('[RAG Search] No keyword matches, returning top vehicles by filters');
    const fallbackResults = scoredVehicles
      .sort((a: any, b: any) => {
        // Sort by year match if target year specified
        if (targetYear) {
          const yearDiffA = Math.abs((a.year_model || a.year_fabrication || 0) - targetYear);
          const yearDiffB = Math.abs((b.year_model || b.year_fabrication || 0) - targetYear);
          if (yearDiffA !== yearDiffB) return yearDiffA - yearDiffB;
        }
        // Then by price (lower first) if max price specified
        if (maxPrice) {
          return (a.sale_price || 0) - (b.sale_price || 0);
        }
        return 0;
      })
      .slice(0, maxResults)
      .map((v: any) => ({
        ...v,
        similarity: 0.3, // Base similarity for filter-only matches
        photo_url: v.images?.[0] || null
      }));

    return new Response(JSON.stringify({ 
      success: true,
      vehicles: fallbackResults,
      query_info: {
        original_query: query,
        extracted_year: targetYear,
        extracted_max_price: maxPrice,
        has_exact_year_match: fallbackResults.some((v: any) => v.year_model === targetYear || v.year_fabrication === targetYear),
        year_tolerance_applied: yearTolerance,
        search_method: 'filter_fallback',
        keywords_searched: keywords
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  return new Response(JSON.stringify({ 
    success: true,
    vehicles: results,
    query_info: {
      original_query: query,
      extracted_year: targetYear,
      extracted_max_price: maxPrice,
      has_exact_year_match: results.some((v: any) => v.year_model === targetYear || v.year_fabrication === targetYear),
      year_tolerance_applied: !results.some((v: any) => v.year_model === targetYear) && targetYear ? yearTolerance : 0,
      search_method: 'text_search',
      keywords_searched: keywords
    }
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
