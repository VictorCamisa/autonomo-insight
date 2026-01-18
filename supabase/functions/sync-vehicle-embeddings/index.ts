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
    const { vehicle_id, sync_all } = body;

    console.log('[RAG Sync] Starting...', { vehicle_id, sync_all });

    let vehiclesToProcess: any[] = [];

    if (sync_all) {
      // Sync all available vehicles
      const { data: vehicles, error } = await supabase
        .from('vehicles')
        .select('id, brand, model, version, year_fabrication, year_model, sale_price, km, color, fuel_type, transmission, notes, status')
        .eq('status', 'disponivel');

      if (error) throw error;
      vehiclesToProcess = vehicles || [];
      console.log('[RAG Sync] Syncing all vehicles:', vehiclesToProcess.length);
    } else if (vehicle_id) {
      // Sync single vehicle
      const { data: vehicle, error } = await supabase
        .from('vehicles')
        .select('id, brand, model, version, year_fabrication, year_model, sale_price, km, color, fuel_type, transmission, notes, status')
        .eq('id', vehicle_id)
        .single();

      if (error) throw error;
      if (vehicle) vehiclesToProcess = [vehicle];
    }

    if (vehiclesToProcess.length === 0) {
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'No vehicles to process',
        processed: 0 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let processed = 0;
    let errors = 0;

    for (const vehicle of vehiclesToProcess) {
      try {
        // Build search text with all relevant vehicle info
        const searchText = buildSearchText(vehicle);
        console.log('[RAG Sync] Processing vehicle:', vehicle.id, '-', searchText.substring(0, 100));

        // Generate embedding using Lovable AI Gateway
        const embedding = await generateEmbedding(searchText, LOVABLE_API_KEY);

        if (!embedding) {
          console.error('[RAG Sync] Failed to generate embedding for vehicle:', vehicle.id);
          errors++;
          continue;
        }

        // Upsert embedding (insert or update)
        const { error: upsertError } = await supabase
          .from('vehicle_embeddings')
          .upsert({
            vehicle_id: vehicle.id,
            embedding: embedding,
            search_text: searchText,
            updated_at: new Date().toISOString(),
          }, {
            onConflict: 'vehicle_id'
          });

        if (upsertError) {
          console.error('[RAG Sync] Error upserting embedding:', upsertError);
          errors++;
          continue;
        }

        processed++;
        console.log('[RAG Sync] Successfully processed vehicle:', vehicle.id);

        // Rate limiting - wait 100ms between requests
        if (vehiclesToProcess.length > 1) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      } catch (vehicleError) {
        console.error('[RAG Sync] Error processing vehicle:', vehicle.id, vehicleError);
        errors++;
      }
    }

    console.log('[RAG Sync] Complete. Processed:', processed, 'Errors:', errors);

    return new Response(JSON.stringify({ 
      success: true, 
      processed,
      errors,
      total: vehiclesToProcess.length
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[RAG Sync] Error:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

// Build comprehensive search text from vehicle data
function buildSearchText(vehicle: any): string {
  const parts: string[] = [];

  // Core vehicle info
  if (vehicle.brand) parts.push(vehicle.brand);
  if (vehicle.model) parts.push(vehicle.model);
  if (vehicle.version) parts.push(vehicle.version);
  
  // Year info
  const year = vehicle.year_model || vehicle.year_fabrication;
  if (year) parts.push(`${year}`);
  
  // Price
  if (vehicle.sale_price) {
    parts.push(`R$ ${Number(vehicle.sale_price).toLocaleString('pt-BR')}`);
    // Add price range keywords for semantic search
    if (vehicle.sale_price < 30000) parts.push('barato econômico popular');
    else if (vehicle.sale_price < 60000) parts.push('médio intermediário');
    else if (vehicle.sale_price < 100000) parts.push('executivo premium');
    else parts.push('luxo top alta gama');
  }
  
  // Mileage
  if (vehicle.km !== null && vehicle.km !== undefined) {
    parts.push(`${Number(vehicle.km).toLocaleString('pt-BR')} km`);
    if (vehicle.km < 30000) parts.push('baixa quilometragem seminovo');
    else if (vehicle.km < 60000) parts.push('quilometragem média');
    else parts.push('alta quilometragem rodado');
  }
  
  // Color
  if (vehicle.color) parts.push(vehicle.color);
  
  // Fuel type with synonyms
  if (vehicle.fuel_type) {
    parts.push(vehicle.fuel_type);
    const fuelSynonyms: Record<string, string> = {
      'flex': 'álcool gasolina',
      'gasolina': 'combustível fóssil',
      'diesel': 'óleo diesel',
      'elétrico': 'elétrico EV zero emissão',
      'híbrido': 'híbrido economia',
    };
    if (fuelSynonyms[vehicle.fuel_type.toLowerCase()]) {
      parts.push(fuelSynonyms[vehicle.fuel_type.toLowerCase()]);
    }
  }
  
  // Transmission
  if (vehicle.transmission) {
    parts.push(vehicle.transmission);
    if (vehicle.transmission.toLowerCase().includes('auto')) {
      parts.push('automático câmbio automático');
    } else {
      parts.push('manual câmbio manual');
    }
  }
  
  // Notes/description
  if (vehicle.notes) parts.push(vehicle.notes);

  // Add common search variations for popular models
  const modelSynonyms: Record<string, string[]> = {
    'polo': ['volkswagen vw'],
    'gol': ['volkswagen vw popular'],
    'onix': ['chevrolet gm'],
    'hb20': ['hyundai hatch'],
    'civic': ['honda sedan'],
    'corolla': ['toyota sedan'],
    'hilux': ['toyota pickup caminhonete'],
    'toro': ['fiat pickup'],
    'compass': ['jeep suv'],
    'tracker': ['chevrolet gm suv'],
    't-cross': ['volkswagen vw suv'],
    'kicks': ['nissan suv'],
    'creta': ['hyundai suv'],
  };

  const modelLower = (vehicle.model || '').toLowerCase();
  for (const [model, synonyms] of Object.entries(modelSynonyms)) {
    if (modelLower.includes(model)) {
      parts.push(...synonyms);
      break;
    }
  }

  return parts.join(' ').trim();
}

// Generate embedding using Lovable AI Gateway (OpenAI compatible)
async function generateEmbedding(text: string, apiKey: string): Promise<number[] | null> {
  try {
    // Use OpenAI's embedding endpoint via Lovable gateway
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
      console.error('[Embedding] API error:', response.status, errorText);
      return null;
    }

    const data = await response.json();
    return data.data?.[0]?.embedding || null;
  } catch (error) {
    console.error('[Embedding] Error:', error);
    return null;
  }
}
