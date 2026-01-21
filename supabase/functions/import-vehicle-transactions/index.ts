import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TransactionRow {
  vehicle_number: number | null;
  brand: string | null;
  model: string | null;
  year: string | null;
  plate: string | null;
  color: string | null;
  renavam: string | null;
  chassis: string | null;
  km_out: number | null;
  seller_name: string | null;
  seller_phone: string | null;
  seller_cpf: string | null;
  seller_rg: string | null;
  seller_address: string | null;
  seller_birth: string | null;
  purchase_date: string | null;
  buyer_name: string | null;
  buyer_phone: string | null;
  buyer_cpf: string | null;
  buyer_rg: string | null;
  buyer_address: string | null;
  buyer_birth: string | null;
  sale_date: string | null;
  observations: string | null;
  seller_customer_id?: string | null;
  buyer_customer_id?: string | null;
}

function parseDate(value: any): string | null {
  if (!value) return null;
  
  if (typeof value === 'number') {
    const excelEpoch = new Date(1899, 11, 30);
    const date = new Date(excelEpoch.getTime() + value * 86400000);
    return date.toISOString().split('T')[0];
  }
  
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return null;
    
    // Formato ISO com hora (2020-05-21 00:00:00)
    const isoMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (isoMatch) {
      return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;
    }
    
    // Formato BR (dd/mm/yyyy)
    const brMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
    if (brMatch) {
      const day = brMatch[1].padStart(2, '0');
      const month = brMatch[2].padStart(2, '0');
      let year = brMatch[3];
      if (year.length === 2) {
        year = parseInt(year) > 50 ? `19${year}` : `20${year}`;
      }
      return `${year}-${month}-${day}`;
    }
    
    const isoDate = new Date(trimmed);
    if (!isNaN(isoDate.getTime())) {
      return isoDate.toISOString().split('T')[0];
    }
  }
  
  return null;
}

function cleanString(value: any): string | null {
  if (value === null || value === undefined) return null;
  const str = String(value).trim();
  if (str === '' || str === '#N/A' || str === '#REF!' || str === '#VALUE!' || str === '#DIV/0!' || str === '#NAME?') {
    return null;
  }
  return str;
}

function cleanNumber(value: any): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number') return Math.round(value);
  const str = String(value).replace(/[^\d.-]/g, '');
  const num = parseFloat(str);
  return isNaN(num) ? null : Math.round(num);
}

function cleanPhone(phone: string | null): string {
  if (!phone) return '';
  const cleaned = phone.replace(/\D/g, '');
  // Adiciona DDD 12 se não tiver
  if (cleaned.length === 8 || cleaned.length === 9) {
    return '12' + cleaned;
  }
  return cleaned || '';
}

function cleanCPF(cpf: string | null): string | null {
  if (!cpf) return null;
  const cleaned = cpf.replace(/\D/g, '');
  if (cleaned.length < 11) return null;
  return cleaned.substring(0, 11);
}

async function findOrCreateCustomer(
  supabase: any,
  name: string | null,
  phone: string | null,
  cpf: string | null,
  rg: string | null,
  address: string | null,
  birth: string | null,
  source: string
): Promise<string | null> {
  if (!name || name === '-') return null;

  const cleanedPhone = cleanPhone(phone);
  const cleanedCPF = cleanCPF(cpf);
  
  // Tenta encontrar cliente existente por CPF
  if (cleanedCPF) {
    const { data: existingByCpf } = await supabase
      .from('customers')
      .select('id')
      .eq('cpf_cnpj', cleanedCPF)
      .single();
    
    if (existingByCpf) {
      console.log(`Cliente encontrado por CPF: ${name}`);
      return existingByCpf.id;
    }
  }
  
  // Tenta encontrar por telefone
  if (cleanedPhone && cleanedPhone.length >= 10) {
    const { data: existingByPhone } = await supabase
      .from('customers')
      .select('id')
      .eq('phone', cleanedPhone)
      .single();
    
    if (existingByPhone) {
      console.log(`Cliente encontrado por telefone: ${name}`);
      return existingByPhone.id;
    }
  }

  // Cria novo cliente
  const customerData: any = {
    name: name,
    phone: cleanedPhone || '0000000000',
    source: source,
  };
  
  if (cleanedCPF) customerData.cpf_cnpj = cleanedCPF;
  if (rg) customerData.rg = rg;
  if (address) customerData.address = address;

  const { data: newCustomer, error } = await supabase
    .from('customers')
    .insert(customerData)
    .select('id')
    .single();

  if (error) {
    console.error('Erro ao criar cliente:', error.message, { name, phone: cleanedPhone });
    return null;
  }

  console.log(`Cliente criado: ${name}`);
  return newCustomer?.id || null;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { rows, dryRun = false, fileType } = await req.json();

    if (!rows || !Array.isArray(rows)) {
      return new Response(
        JSON.stringify({ success: false, error: 'Dados inválidos. Esperado array de linhas.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Processando ${rows.length} linhas. DryRun: ${dryRun}, FileType: ${fileType || 'auto'}`);
    
    // Log das colunas disponíveis na primeira linha para debug
    if (rows.length > 0) {
      console.log('Colunas disponíveis:', Object.keys(rows[0]));
    }

    // Detecta tipo de arquivo baseado nas colunas
    const firstRow = rows[0] || {};
    const isSellerFile = 'NOME DO VENDEDOR' in firstRow || 'ENTRADA' in firstRow;
    const isBuyerFile = 'NOME DO COMPRADOR' in firstRow || 'SAIDA' in firstRow;
    
    console.log(`Tipo detectado - Vendedor: ${isSellerFile}, Comprador: ${isBuyerFile}`);

    const transactions: TransactionRow[] = [];
    const errors: string[] = [];
    let customersCreated = 0;

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 2;

      try {
        const transaction: TransactionRow = {
          vehicle_number: cleanNumber(row['N°']),
          brand: cleanString(row['MARCA']),
          model: cleanString(row['MODELO']),
          year: cleanString(row['ANO']),
          plate: cleanString(row['PLACA']),
          color: cleanString(row['COR']),
          renavam: cleanString(row['RENAVAM']),
          chassis: cleanString(row['CHASSI']),
          km_out: cleanNumber(row['KM S']),
          observations: cleanString(row['OBSERVAÇÕES']),
          // Campos do vendedor
          seller_name: cleanString(row['NOME DO VENDEDOR']),
          seller_phone: cleanString(row['TEL']),
          seller_cpf: cleanString(row['CPF']),
          seller_rg: cleanString(row['RG']),
          seller_address: cleanString(row['ENDEREÇO']),
          seller_birth: parseDate(row['NASCI']),
          purchase_date: parseDate(row['ENTRADA']),
          // Campos do comprador
          buyer_name: cleanString(row['NOME DO COMPRADOR']),
          buyer_phone: isSellerFile ? null : cleanString(row['TEL']),
          buyer_cpf: isSellerFile ? null : cleanString(row['CPF']),
          buyer_rg: isSellerFile ? null : cleanString(row['RG']),
          buyer_address: isSellerFile ? null : cleanString(row['ENDEREÇO']),
          buyer_birth: parseDate(row['NASC']),
          sale_date: parseDate(row['SAIDA']),
        };

        // Pula linhas completamente vazias
        if (!transaction.brand && !transaction.model && !transaction.plate && 
            !transaction.seller_name && !transaction.buyer_name) {
          continue;
        }

        // Se não é dry run, cria os clientes
        if (!dryRun) {
          // Cria cliente vendedor (de quem a loja comprou)
          if (transaction.seller_name) {
            const sellerCustomerId = await findOrCreateCustomer(
              supabase,
              transaction.seller_name,
              transaction.seller_phone,
              transaction.seller_cpf,
              transaction.seller_rg,
              transaction.seller_address,
              transaction.seller_birth,
              'importacao_vendedor'
            );
            transaction.seller_customer_id = sellerCustomerId;
            if (sellerCustomerId) customersCreated++;
          }

          // Cria cliente comprador (para quem a loja vendeu)
          if (transaction.buyer_name) {
            const buyerCustomerId = await findOrCreateCustomer(
              supabase,
              transaction.buyer_name,
              transaction.buyer_phone,
              transaction.buyer_cpf,
              transaction.buyer_rg,
              transaction.buyer_address,
              transaction.buyer_birth,
              'importacao_comprador'
            );
            transaction.buyer_customer_id = buyerCustomerId;
            if (buyerCustomerId) customersCreated++;
          }
        }

        transactions.push(transaction);
      } catch (err: any) {
        errors.push(`Linha ${rowNum}: ${err?.message || 'Erro desconhecido'}`);
      }
    }

    console.log(`Transações válidas: ${transactions.length}`);

    if (dryRun) {
      return new Response(
        JSON.stringify({
          success: true,
          dryRun: true,
          totalRows: rows.length,
          validTransactions: transactions.length,
          fileType: isSellerFile ? 'vendedores' : isBuyerFile ? 'compradores' : 'desconhecido',
          errors,
          preview: transactions.slice(0, 5),
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Insere transações em lotes de 50
    let inserted = 0;
    const batchSize = 50;

    for (let i = 0; i < transactions.length; i += batchSize) {
      const batch = transactions.slice(i, i + batchSize);
      
      const { data, error } = await supabase
        .from('vehicle_transactions')
        .insert(batch)
        .select('id');

      if (error) {
        console.error(`Erro no lote ${Math.floor(i / batchSize) + 1}:`, error);
        errors.push(`Lote ${Math.floor(i / batchSize) + 1}: ${error.message}`);
      } else {
        inserted += data?.length || 0;
      }
    }

    console.log(`Inseridos: ${inserted} registros, ${customersCreated} clientes criados/encontrados`);

    return new Response(
      JSON.stringify({
        success: true,
        totalRows: rows.length,
        validTransactions: transactions.length,
        inserted,
        customersCreated,
        errors,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Erro geral:', error);
    return new Response(
      JSON.stringify({ success: false, error: error?.message || 'Erro desconhecido' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});