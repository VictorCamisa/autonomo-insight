import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TransactionRow {
  vehicle_number: number | null;
  brand: string | null;
  model: string | null;
  plate: string | null;
  renavam: string | null;
  chassis: string | null;
  seller_name: string | null;
  seller_phone: string | null;
  seller_cpf: string | null;
  seller_address: string | null;
  purchase_date: string | null;
  buyer_name: string | null;
  buyer_phone: string | null;
  buyer_cpf: string | null;
  buyer_address: string | null;
  sale_date: string | null;
  km_out: number | null;
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
  return str === '' ? null : str;
}

function cleanNumber(value: any): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number') return value;
  const num = parseInt(String(value).replace(/\D/g, ''));
  return isNaN(num) ? null : num;
}

function cleanPhone(phone: string | null): string {
  if (!phone) return '';
  // Limpa e formata telefone, garantindo pelo menos algo para o campo obrigatório
  const cleaned = phone.replace(/\D/g, '');
  return cleaned || '00000000000';
}

async function findOrCreateCustomer(
  supabase: any,
  name: string | null,
  phone: string | null,
  cpf: string | null,
  address: string | null,
  source: string
): Promise<string | null> {
  if (!name || name === '-') return null;

  const cleanedPhone = cleanPhone(phone);
  
  // Tenta encontrar cliente existente por CPF ou telefone
  if (cpf) {
    const { data: existingByCpf } = await supabase
      .from('customers')
      .select('id')
      .eq('cpf_cnpj', cpf)
      .single();
    
    if (existingByCpf) return existingByCpf.id;
  }
  
  if (cleanedPhone && cleanedPhone !== '00000000000') {
    const { data: existingByPhone } = await supabase
      .from('customers')
      .select('id')
      .eq('phone', cleanedPhone)
      .single();
    
    if (existingByPhone) return existingByPhone.id;
  }

  // Cria novo cliente
  const { data: newCustomer, error } = await supabase
    .from('customers')
    .insert({
      name: name,
      phone: cleanedPhone || '00000000000',
      cpf_cnpj: cpf,
      address: address,
      source: source,
    })
    .select('id')
    .single();

  if (error) {
    console.error('Erro ao criar cliente:', error.message, { name, phone: cleanedPhone });
    return null;
  }

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

    const { rows, dryRun = false } = await req.json();

    if (!rows || !Array.isArray(rows)) {
      return new Response(
        JSON.stringify({ success: false, error: 'Dados inválidos. Esperado array de linhas.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Processando ${rows.length} linhas. DryRun: ${dryRun}`);

    const transactions: TransactionRow[] = [];
    const errors: string[] = [];
    let customersCreated = 0;

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 2;

      try {
        const transaction: TransactionRow = {
          vehicle_number: cleanNumber(row['NUM']),
          brand: cleanString(row['MARCA']),
          model: cleanString(row['MODELO']),
          plate: cleanString(row['PLACA']),
          renavam: cleanString(row['RENAVAM']),
          chassis: cleanString(row['CHASSI']),
          seller_name: cleanString(row['NOME (Origem/ Compra/ DE QUEM A LOJA COMPROU)']),
          seller_phone: cleanString(row['TELEFONE (Origem)']),
          seller_cpf: cleanString(row['CPF CNPJ (Origem)']),
          seller_address: cleanString(row['ENDEREÇO (Origem)']),
          purchase_date: parseDate(row['DATA DA COMPRA']),
          buyer_name: cleanString(row['NOME (Destino/ Venda/ PARA QUEM A LOJA VENDEU)']),
          buyer_phone: cleanString(row['TELEFONE (Destino)']),
          buyer_cpf: cleanString(row['CPF CNPJ (Destino)']),
          buyer_address: cleanString(row['ENDEREÇO (Destino)']),
          sale_date: parseDate(row['DATA DA VENDA']),
          km_out: cleanNumber(row['KM SAIDA']),
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
              transaction.seller_address,
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
              transaction.buyer_address,
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
