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
}

function parseDate(value: any): string | null {
  if (!value) return null;
  
  // Se for número (Excel serial date)
  if (typeof value === 'number') {
    const excelEpoch = new Date(1899, 11, 30);
    const date = new Date(excelEpoch.getTime() + value * 86400000);
    return date.toISOString().split('T')[0];
  }
  
  // Se for string
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return null;
    
    // Tenta formato dd/mm/yyyy
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
    
    // Tenta ISO
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

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 2; // +2 porque começa da linha 2 (1 é header)

      try {
        // Mapeia as colunas da planilha para o objeto
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

    // Insere em lotes de 100
    let inserted = 0;
    const batchSize = 100;

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

    console.log(`Inseridos: ${inserted} registros`);

    return new Response(
      JSON.stringify({
        success: true,
        totalRows: rows.length,
        validTransactions: transactions.length,
        inserted,
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
