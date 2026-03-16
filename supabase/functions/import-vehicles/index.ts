import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Mapping tables for converting IDs to readable values
const COR_MAP: Record<string, string> = {
  '1': 'Branco',
  '2': 'Preto', 
  '3': 'Prata',
  '4': 'Cinza',
  '5': 'Vermelho',
  '6': 'Azul',
  '7': 'Verde',
  '8': 'Amarelo',
  '9': 'Laranja',
  '10': 'Marrom',
  '11': 'Bege',
  '12': 'Dourado',
  '13': 'Vinho',
  '14': 'Rosa',
  '15': 'Roxo',
  '16': 'Azul Metálico',
  '17': 'Preto',
  '18': 'Grafite',
  '19': 'Champagne',
  '20': 'Bronze',
}

const COMBUSTIVEL_MAP: Record<string, string> = {
  '1': 'gasolina',
  '2': 'flex',
  '3': 'diesel',
  '4': 'etanol',
  '5': 'eletrico',
  '6': 'hibrido',
  '7': 'gnv',
}

const CAMBIO_MAP: Record<string, string> = {
  '1': 'manual',
  '2': 'automatico',
  '3': 'automatizado',
  '4': 'cvt',
}

// Extract brand and model from description
function extractBrandModel(descricao: string): { brand: string; model: string; version: string | null } {
  // Common patterns: "MARCA MODELO VERSÃO" or extract from first line
  const firstLine = descricao.split('\n')[0].trim()
  
  // Common brand patterns
  const brands = [
    'VOLKSWAGEN', 'VW', 'FIAT', 'CHEVROLET', 'GM', 'FORD', 'TOYOTA', 'HONDA', 
    'HYUNDAI', 'NISSAN', 'RENAULT', 'PEUGEOT', 'CITROEN', 'JEEP', 'MITSUBISHI',
    'KIA', 'BMW', 'MERCEDES', 'AUDI', 'VOLVO', 'LAND ROVER', 'SUZUKI', 'JAC',
    'CHERY', 'CAOA CHERY', 'BYD', 'GWM', 'RAM', 'DODGE', 'CHRYSLER', 'MINI'
  ]
  
  // Try to find brand in first line
  let brand = 'Outros'
  let model = firstLine
  let version: string | null = null
  
  for (const b of brands) {
    if (firstLine.toUpperCase().includes(b)) {
      brand = b === 'VW' ? 'VOLKSWAGEN' : b === 'GM' ? 'CHEVROLET' : b
      // Remove brand from model
      model = firstLine.toUpperCase().replace(b, '').trim()
      break
    }
  }
  
  // Split model and version
  const parts = model.split(' ')
  if (parts.length > 1) {
    model = parts[0]
    version = parts.slice(1).join(' ')
  }
  
  // Capitalize properly
  brand = brand.charAt(0).toUpperCase() + brand.slice(1).toLowerCase()
  model = model.charAt(0).toUpperCase() + model.slice(1).toLowerCase()
  
  return { brand, model, version }
}

// Parse XML field value
function getFieldValue(row: string, fieldName: string): string | null {
  const regex = new RegExp(`<field name="${fieldName}"[^>]*>([^<]*)</field>`, 'i')
  const match = row.match(regex)
  if (match && match[1]) {
    return match[1].trim()
  }
  
  // Check for nil values
  const nilRegex = new RegExp(`<field name="${fieldName}"[^>]*xsi:nil="true"[^>]*/>`, 'i')
  if (nilRegex.test(row)) {
    return null
  }
  
  return null
}

// Parse XML field value array (for tags like <Fotos><Foto>url</Foto></Fotos>)
function getPhotosUrl(rowXml: string): string[] {
  const fotosMatch = rowXml.match(/<Fotos>([\s\S]*?)<\/Fotos>/i)
  if (!fotosMatch) return []
  
  const fotosHtml = fotosMatch[1]
  const urlRegex = /<Foto>([^<]+)<\/Foto>/gi
  const urls: string[] = []
  let match
  
  while ((match = urlRegex.exec(fotosHtml)) !== null) {
    if (match[1] && match[1].trim()) {
      urls.push(match[1].trim())
    }
  }
  
  return urls
}

// Parse single vehicle row
function parseVehicleRow(rowXml: string): Record<string, any> | null {
  const statusVeiculo = getFieldValue(rowXml, 'StatusVeiculo')
  
  // Only import active vehicles (StatusVeiculo = 1)
  if (statusVeiculo !== '1') {
    console.log(`Skipping vehicle with status ${statusVeiculo}`)
    return null
  }
  
  const descricao = getFieldValue(rowXml, 'Descricao') || ''
  const { brand, model, version } = extractBrandModel(descricao)
  
  const ano = getFieldValue(rowXml, 'Ano')
  const anoModelo = getFieldValue(rowXml, 'AnoModelo')
  const km = getFieldValue(rowXml, 'Km')
  const valor = getFieldValue(rowXml, 'Valor')
  const placa = getFieldValue(rowXml, 'Placa')
  const chassi = getFieldValue(rowXml, 'Chassi')
  const renavam = getFieldValue(rowXml, 'Renavam')
  const portas = getFieldValue(rowXml, 'QtdPortas')
  const corId = getFieldValue(rowXml, 'CorId')
  const combustivelId = getFieldValue(rowXml, 'CombustivelId')
  const cambioId = getFieldValue(rowXml, 'CambioId')
  const mercadoLibreId = getFieldValue(rowXml, 'MercadoLibreId')
  const tipoMotor = getFieldValue(rowXml, 'TipoMotor')
  const images = getPhotosUrl(rowXml)
  
  return {
    brand,
    model,
    version: version || tipoMotor,
    year_fabrication: ano ? parseInt(ano) : new Date().getFullYear(),
    year_model: anoModelo ? parseInt(anoModelo) : (ano ? parseInt(ano) : new Date().getFullYear()),
    km: km ? parseInt(km) : 0,
    sale_price: valor ? parseFloat(valor) : null,
    plate: placa,
    chassis: chassi,
    renavam: renavam,
    doors: portas ? parseInt(portas) : 4,
    color: corId ? (COR_MAP[corId] || 'Não especificada') : 'Não especificada',
    fuel_type: combustivelId ? (COMBUSTIVEL_MAP[combustivelId] || 'flex') : 'flex',
    transmission: cambioId ? (CAMBIO_MAP[cambioId] || 'manual') : 'manual',
    mercadolibre_id: mercadoLibreId,
    notes: descricao.substring(0, 500), // Limit notes length
    images: images.length > 0 ? images : null,
    status: 'disponivel',
    featured: false,
  }
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    
    const { xmlContent, dryRun = false } = await req.json()
    
    if (!xmlContent) {
      return new Response(
        JSON.stringify({ error: 'xmlContent é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    
    console.log('Processing XML import...')
    console.log(`XML content length: ${xmlContent.length} characters`)
    
    // Split XML into rows
    const rowRegex = /<row>([\s\S]*?)<\/row>/gi
    const rows: string[] = []
    let match
    while ((match = rowRegex.exec(xmlContent)) !== null) {
      rows.push(match[1])
    }
    
    console.log(`Found ${rows.length} vehicle rows in XML`)
    
    const vehicles: any[] = []
    const skipped: string[] = []
    const errors: string[] = []
    
    for (let i = 0; i < rows.length; i++) {
      try {
        const vehicle = parseVehicleRow(rows[i])
        if (vehicle) {
          vehicles.push(vehicle)
          console.log(`Parsed vehicle ${i + 1}: ${vehicle.brand} ${vehicle.model} - ${vehicle.mercadolibre_id}`)
        } else {
          skipped.push(`Row ${i + 1}: Status não ativo`)
        }
      } catch (err) {
        console.error(`Error parsing row ${i + 1}:`, err)
        errors.push(`Row ${i + 1}: ${err instanceof Error ? err.message : String(err)}`)
      }
    }
    
    console.log(`Parsed ${vehicles.length} active vehicles, skipped ${skipped.length}`)
    
    if (dryRun) {
      return new Response(
        JSON.stringify({
          success: true,
          dryRun: true,
          total: rows.length,
          active: vehicles.length,
          skipped: skipped.length,
          vehicles: vehicles.slice(0, 10), // Preview first 10
          message: `Encontrados ${vehicles.length} veículos ativos para importar`
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    
    // Insert vehicles into database
    let inserted = 0
    let duplicates = 0
    const insertErrors: string[] = []
    
    for (const vehicle of vehicles) {
      try {
        // Check if vehicle already exists by mercadolibre_id or plate
        let exists = false
        
        if (vehicle.mercadolibre_id) {
          const { data: existingML } = await supabase
            .from('vehicles')
            .select('id')
            .eq('mercadolibre_id', vehicle.mercadolibre_id)
            .single()
          
          if (existingML) {
            exists = true
            duplicates++
            console.log(`Vehicle with ML ID ${vehicle.mercadolibre_id} already exists, skipping`)
          }
        }
        
        if (!exists && vehicle.plate) {
          const { data: existingPlate } = await supabase
            .from('vehicles')
            .select('id')
            .eq('plate', vehicle.plate)
            .single()
          
          if (existingPlate) {
            exists = true
            duplicates++
            console.log(`Vehicle with plate ${vehicle.plate} already exists, skipping`)
          }
        }
        
        if (!exists) {
          const { error: insertError } = await supabase
            .from('vehicles')
            .insert(vehicle)
          
          if (insertError) {
            console.error(`Error inserting vehicle:`, insertError)
            insertErrors.push(`${vehicle.brand} ${vehicle.model}: ${insertError.message}`)
          } else {
            inserted++
            console.log(`Inserted vehicle: ${vehicle.brand} ${vehicle.model}`)
          }
        }
      } catch (err) {
        console.error(`Error processing vehicle:`, err)
        insertErrors.push(`${vehicle.brand} ${vehicle.model}: ${err instanceof Error ? err.message : String(err)}`)
      }
    }
    
    console.log(`Import complete: ${inserted} inserted, ${duplicates} duplicates, ${insertErrors.length} errors`)
    
    return new Response(
      JSON.stringify({
        success: true,
        total: rows.length,
        active: vehicles.length,
        inserted,
        duplicates,
        errors: insertErrors,
        message: `Importados ${inserted} veículos com sucesso. ${duplicates} duplicados ignorados.`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
    
  } catch (error) {
    console.error('Error in import-vehicles function:', error)
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
