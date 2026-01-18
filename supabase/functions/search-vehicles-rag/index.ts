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
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

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

    // Generate embedding for the query
    const queryEmbedding = await generateEmbedding(query, LOVABLE_API_KEY);
    
    if (!queryEmbedding) {
      console.error('[RAG Search] Failed to generate query embedding');
      // Fallback to text search
      return await fallbackTextSearch(supabase, query, max_results, effectiveTargetYear, year_tolerance, effectiveMaxPrice);
    }

    // Search using pgvector
    const { data: searchResults, error: searchError } = await supabase
      .rpc('search_similar_vehicles', {
        query_embedding: queryEmbedding,
        match_threshold: 0.5, // Lower threshold for more results
        match_count: max_results * 2, // Get more to filter
        year_tolerance: year_tolerance,
        target_year: effectiveTargetYear
      });

    if (searchError) {
      console.error('[RAG Search] Vector search error:', searchError);
      return await fallbackTextSearch(supabase, query, max_results, effectiveTargetYear, year_tolerance, effectiveMaxPrice);
    }

    console.log('[RAG Search] Found', searchResults?.length || 0, 'similar vehicles');

    if (!searchResults || searchResults.length === 0) {
      // No vector matches, try text search
      return await fallbackTextSearch(supabase, query, max_results, effectiveTargetYear, year_tolerance, effectiveMaxPrice);
    }

    // Get full vehicle details for matched IDs
    const vehicleIds = searchResults.map((r: any) => r.vehicle_id);
    
    let vehicleQuery = supabase
      .from('vehicles')
      .select('id, brand, model, version, year_fabrication, year_model, sale_price, km, color, fuel_type, transmission, images, status')
      .in('id', vehicleIds)
      .eq('status', 'disponivel');

    // Apply price filter if specified
    if (effectiveMaxPrice) {
      const maxWithTolerance = effectiveMaxPrice * (1 + price_tolerance_percent / 100);
      vehicleQuery = vehicleQuery.lte('sale_price', maxWithTolerance);
    }

    const { data: vehicles, error: vehiclesError } = await vehicleQuery;

    if (vehiclesError) {
      console.error('[RAG Search] Error fetching vehicles:', vehiclesError);
      throw vehiclesError;
    }

    // Merge similarity scores and sort by relevance
    const vehiclesWithScores = (vehicles || []).map((v: any) => {
      const searchResult = searchResults.find((r: any) => r.vehicle_id === v.id);
      return {
        ...v,
        similarity: searchResult?.similarity || 0,
        search_text: searchResult?.search_text || '',
      };
    }).sort((a: any, b: any) => b.similarity - a.similarity);

    // Limit to max_results
    const finalVehicles = vehiclesWithScores.slice(0, max_results);

    console.log('[RAG Search] Returning', finalVehicles.length, 'vehicles');

    // If no exact match but we have year, add message about alternatives
    const hasExactYearMatch = effectiveTargetYear && finalVehicles.some((v: any) => 
      v.year_model === effectiveTargetYear || v.year_fabrication === effectiveTargetYear
    );

    return new Response(JSON.stringify({ 
      success: true,
      vehicles: finalVehicles,
      query_info: {
        original_query: query,
        extracted_year: extractedYear,
        extracted_max_price: extractedMaxPrice,
        has_exact_year_match: hasExactYearMatch,
        year_tolerance_applied: !hasExactYearMatch && effectiveTargetYear ? year_tolerance : 0,
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

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

// Generate embedding using Lovable AI Gateway
async function generateEmbedding(text: string, apiKey: string): Promise<number[] | null> {
  try {
    const response = await fetch('https://ai.gateway.lovable.dev/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'text-embedding-3-small',
        input: text,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[RAG Embedding] API error:', response.status, errorText);
      return null;
    }

    const data = await response.json();
    return data.data?.[0]?.embedding || null;
  } catch (error) {
    console.error('[RAG Embedding] Error:', error);
    return null;
  }
}

// Fallback text search when vector search fails
async function fallbackTextSearch(
  supabase: any,
  query: string,
  maxResults: number,
  targetYear: number | null,
  yearTolerance: number,
  maxPrice: number | null
): Promise<Response> {
  console.log('[RAG Search] Using fallback text search');

  // Extract keywords from query
  const keywords = query.toLowerCase()
    .replace(/[^\w\s]/g, '')
    .split(/\s+/)
    .filter(k => k.length > 2 && !['que', 'para', 'com', 'sem', 'até', 'ate', 'mil'].includes(k));

  let vehicleQuery = supabase
    .from('vehicles')
    .select('id, brand, model, version, year_fabrication, year_model, sale_price, km, color, fuel_type, transmission, images, status')
    .eq('status', 'disponivel')
    .limit(50);

  const { data: allVehicles, error } = await vehicleQuery;

  if (error) {
    return new Response(JSON.stringify({ 
      error: error.message,
      vehicles: []
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Score vehicles based on keyword matches
  const scoredVehicles = (allVehicles || []).map((v: any) => {
    const vehicleText = `${v.brand} ${v.model} ${v.version || ''} ${v.year_model || v.year_fabrication || ''}`.toLowerCase();
    let score = 0;

    // Keyword matching
    for (const keyword of keywords) {
      if (vehicleText.includes(keyword)) {
        score += 10;
      }
    }

    // Year proximity bonus
    if (targetYear && (v.year_model || v.year_fabrication)) {
      const vehicleYear = v.year_model || v.year_fabrication;
      const yearDiff = Math.abs(vehicleYear - targetYear);
      if (yearDiff === 0) {
        score += 20;
      } else if (yearDiff <= yearTolerance) {
        score += 10 - yearDiff * 2;
      }
    }

    // Price filter
    if (maxPrice && v.sale_price && v.sale_price > maxPrice * 1.2) {
      score = 0; // Exclude if way over budget
    } else if (maxPrice && v.sale_price && v.sale_price <= maxPrice) {
      score += 5; // Bonus for being within budget
    }

    return { ...v, similarity: score / 30 }; // Normalize to 0-1 range
  });

  // Filter and sort
  const results = scoredVehicles
    .filter((v: any) => v.similarity > 0)
    .sort((a: any, b: any) => b.similarity - a.similarity)
    .slice(0, maxResults);

  return new Response(JSON.stringify({ 
    success: true,
    vehicles: results,
    query_info: {
      original_query: query,
      extracted_year: targetYear,
      extracted_max_price: maxPrice,
      has_exact_year_match: results.some((v: any) => v.year_model === targetYear || v.year_fabrication === targetYear),
      year_tolerance_applied: yearTolerance,
      search_method: 'text_fallback'
    }
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
