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

    const body = await req.json();
    const { vehicle_id, sync_all } = body;

    console.log('[RAG Sync] Starting...', { vehicle_id, sync_all });

    let vehiclesToProcess: any[] = [];

    if (sync_all) {
      // Sync all available vehicles
      const { data: vehicles, error } = await supabase
        .from('vehicles')
        .select('id, brand, model, version, year_fabrication, year_model, sale_price, km, color, fuel_type, transmission, notes, status, images')
        .eq('status', 'disponivel');

      if (error) throw error;
      vehiclesToProcess = vehicles || [];
      console.log('[RAG Sync] Syncing all vehicles:', vehiclesToProcess.length);
    } else if (vehicle_id) {
      // Sync single vehicle
      const { data: vehicle, error } = await supabase
        .from('vehicles')
        .select('id, brand, model, version, year_fabrication, year_model, sale_price, km, color, fuel_type, transmission, notes, status, images')
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

        // Store in vehicle_embeddings table WITHOUT vector embedding
        // We'll use text-based search instead since Lovable AI doesn't support embeddings
        const { error: upsertError } = await supabase
          .from('vehicle_embeddings')
          .upsert({
            vehicle_id: vehicle.id,
            embedding: null, // No embedding since API doesn't support it
            search_text: searchText,
            updated_at: new Date().toISOString(),
          }, {
            onConflict: 'vehicle_id'
          });

        if (upsertError) {
          console.error('[RAG Sync] Error upserting:', upsertError);
          errors++;
          continue;
        }

        processed++;
        console.log('[RAG Sync] Successfully processed vehicle:', vehicle.id);

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

// Build comprehensive search text from vehicle data - EXPANDED FOR ALL MODELS
function buildSearchText(vehicle: any): string {
  const parts: string[] = [];

  // Core vehicle info - NORMALIZADO
  if (vehicle.brand) {
    parts.push(vehicle.brand);
    // Adicionar variações de marca
    const brandLower = vehicle.brand.toLowerCase();
    if (brandLower === 'volkswagen') parts.push('vw');
    if (brandLower === 'chevrolet') parts.push('gm');
    if (brandLower === 'citroën' || brandLower === 'citroen') parts.push('citroen citroën');
    if (brandLower === 'land rover') parts.push('landrover');
  }
  
  if (vehicle.model) {
    parts.push(vehicle.model);
    // Adicionar variações do modelo
    const modelLower = vehicle.model.toLowerCase().trim();
    // Sem espaços
    parts.push(modelLower.replace(/\s+/g, ''));
    // Com hífen
    parts.push(modelLower.replace(/\s+/g, '-'));
    // Palavras individuais
    modelLower.split(/\s+/).forEach((word: string) => {
      if (word.length > 1) parts.push(word);
    });
  }
  
  if (vehicle.version) parts.push(vehicle.version);
  
  // Year info - MÚLTIPLOS FORMATOS
  const year = vehicle.year_model || vehicle.year_fabrication;
  if (year) {
    parts.push(`${year}`);
    parts.push(`ano ${year}`);
    // Anos próximos para tolerância
    parts.push(`${year - 1} ${year + 1}`);
  }
  
  // Price - MÚLTIPLOS FORMATOS
  if (vehicle.sale_price) {
    const price = Number(vehicle.sale_price);
    parts.push(`R$ ${price.toLocaleString('pt-BR')}`);
    parts.push(`${price}`);
    parts.push(`${Math.round(price / 1000)}k`);
    parts.push(`${Math.round(price / 1000)} mil`);
    
    // Add price range keywords for semantic search
    if (price < 30000) parts.push('barato econômico popular acessível entrada');
    else if (price < 60000) parts.push('médio intermediário custo-benefício');
    else if (price < 100000) parts.push('executivo premium confortável');
    else if (price < 150000) parts.push('luxo top alta gama sofisticado');
    else parts.push('luxo exclusivo top de linha importado premium');
  }
  
  // Mileage - MÚLTIPLOS FORMATOS
  if (vehicle.km !== null && vehicle.km !== undefined) {
    const km = Number(vehicle.km);
    parts.push(`${km.toLocaleString('pt-BR')} km`);
    parts.push(`${km} quilometros`);
    
    if (km < 20000) parts.push('zero km novinho seminovo baixíssima quilometragem');
    else if (km < 40000) parts.push('baixa quilometragem seminovo pouco rodado');
    else if (km < 80000) parts.push('quilometragem média normal');
    else if (km < 120000) parts.push('quilometragem alta rodado');
    else parts.push('alta quilometragem muito rodado');
  }
  
  // Color - COM VARIAÇÕES
  if (vehicle.color) {
    parts.push(vehicle.color);
    const colorLower = vehicle.color.toLowerCase();
    // Variações de cor
    const colorVariations: Record<string, string> = {
      'preto': 'preta black escuro',
      'branco': 'branca white claro',
      'prata': 'prato silver cinza',
      'cinza': 'grafite grey gray',
      'vermelho': 'vermelha red rubi',
      'azul': 'blue marinho',
      'verde': 'green',
    };
    if (colorVariations[colorLower]) parts.push(colorVariations[colorLower]);
  }
  
  // Fuel type with synonyms
  if (vehicle.fuel_type) {
    parts.push(vehicle.fuel_type);
    const fuelSynonyms: Record<string, string> = {
      'flex': 'álcool gasolina bicombustível',
      'gasolina': 'combustível fóssil gasosa',
      'diesel': 'óleo diesel econômico força',
      'elétrico': 'elétrico EV zero emissão sustentável',
      'híbrido': 'híbrido economia sustentável plug-in',
    };
    if (fuelSynonyms[vehicle.fuel_type.toLowerCase()]) {
      parts.push(fuelSynonyms[vehicle.fuel_type.toLowerCase()]);
    }
  }
  
  // Transmission - COM VARIAÇÕES
  if (vehicle.transmission) {
    parts.push(vehicle.transmission);
    const transLower = vehicle.transmission.toLowerCase();
    if (transLower.includes('auto')) {
      parts.push('automático câmbio automático automatico at');
    } else if (transLower.includes('cvt')) {
      parts.push('cvt automático variável');
    } else {
      parts.push('manual câmbio manual mt');
    }
  }
  
  // Notes/description
  if (vehicle.notes) parts.push(vehicle.notes);

  // Status
  parts.push('disponível disponivel em estoque pronta entrega');

  // Add first image URL for reference
  if (vehicle.images && Array.isArray(vehicle.images) && vehicle.images.length > 0) {
    parts.push(`foto:${vehicle.images[0]}`);
  }

  return parts.join(' ').trim();
}
