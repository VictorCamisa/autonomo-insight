import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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
    
    const isoMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (isoMatch) {
      return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;
    }
    
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
        JSON.stringify({ success: false, error: 'Dados inválidos.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Processando ${rows.length} linhas. DryRun: ${dryRun}`);
    
    if (rows.length > 0) {
      console.log('Colunas:', Object.keys(rows[0]).slice(0, 10));
    }

    const firstRow = rows[0] || {};
    const isSellerFile = 'NOME DO VENDEDOR' in firstRow || 'ENTRADA' in firstRow;
    const isBuyerFile = 'NOME DO COMPRADOR' in firstRow || 'SAIDA' in firstRow;
    const fileType = isSellerFile ? 'vendedores' : isBuyerFile ? 'compradores' : 'desconhecido';
    
    console.log(`Tipo: ${fileType}`);

    // Processa todas as linhas e extrai dados
    const transactions: any[] = [];
    const customersToCreate: Map<string, any> = new Map();
    const errors: string[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      
      try {
        const transaction: any = {
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
        };

        // Campos do vendedor
        if (isSellerFile) {
          transaction.seller_name = cleanString(row['NOME DO VENDEDOR']);
          transaction.seller_phone = cleanString(row['TEL']);
          transaction.seller_cpf = cleanString(row['CPF']);
          transaction.seller_rg = cleanString(row['RG']);
          transaction.seller_address = cleanString(row['ENDEREÇO']);
          transaction.purchase_date = parseDate(row['ENTRADA']);
          
          // Adiciona cliente à lista para criar
          if (transaction.seller_name && transaction.seller_name !== '-') {
            const key = cleanCPF(transaction.seller_cpf) || cleanPhone(transaction.seller_phone) || transaction.seller_name;
            if (!customersToCreate.has(key)) {
              customersToCreate.set(key, {
                name: transaction.seller_name,
                phone: cleanPhone(transaction.seller_phone) || '0000000000',
                cpf_cnpj: cleanCPF(transaction.seller_cpf),
                rg: transaction.seller_rg,
                address: transaction.seller_address,
                source: 'importacao_vendedor',
              });
            }
          }
        }

        // Campos do comprador
        if (isBuyerFile) {
          transaction.buyer_name = cleanString(row['NOME DO COMPRADOR']);
          transaction.buyer_phone = cleanString(row['TEL']);
          transaction.buyer_cpf = cleanString(row['CPF']);
          transaction.buyer_rg = cleanString(row['RG']);
          transaction.buyer_address = cleanString(row['ENDEREÇO']);
          transaction.sale_date = parseDate(row['SAIDA']);
          
          // Adiciona cliente à lista para criar
          if (transaction.buyer_name && transaction.buyer_name !== '-') {
            const key = cleanCPF(transaction.buyer_cpf) || cleanPhone(transaction.buyer_phone) || transaction.buyer_name;
            if (!customersToCreate.has(key)) {
              customersToCreate.set(key, {
                name: transaction.buyer_name,
                phone: cleanPhone(transaction.buyer_phone) || '0000000000',
                cpf_cnpj: cleanCPF(transaction.buyer_cpf),
                rg: transaction.buyer_rg,
                address: transaction.buyer_address,
                source: 'importacao_comprador',
              });
            }
          }
        }

        // Pula linhas vazias
        if (!transaction.brand && !transaction.model && !transaction.plate) {
          continue;
        }

        transactions.push(transaction);
      } catch (err: any) {
        errors.push(`Linha ${i + 2}: ${err?.message || 'Erro'}`);
      }
    }

    console.log(`Transações: ${transactions.length}, Clientes únicos: ${customersToCreate.size}`);

    if (dryRun) {
      return new Response(
        JSON.stringify({
          success: true,
          dryRun: true,
          totalRows: rows.length,
          validTransactions: transactions.length,
          uniqueCustomers: customersToCreate.size,
          fileType,
          errors: errors.slice(0, 10),
          preview: transactions.slice(0, 5),
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ===== IMPORTAÇÃO REAL =====
    
    // 1. Busca clientes existentes por CPF
    const cpfs = Array.from(customersToCreate.values())
      .filter(c => c.cpf_cnpj)
      .map(c => c.cpf_cnpj);
    
    const { data: existingByCpf } = await supabase
      .from('customers')
      .select('id, cpf_cnpj, phone')
      .in('cpf_cnpj', cpfs.length > 0 ? cpfs : ['__none__']);
    
    const cpfToId = new Map((existingByCpf || []).map(c => [c.cpf_cnpj, c.id]));
    console.log(`Clientes existentes por CPF: ${cpfToId.size}`);

    // 2. Busca clientes existentes por telefone
    const phones = Array.from(customersToCreate.values())
      .filter(c => c.phone && c.phone !== '0000000000')
      .map(c => c.phone);
    
    const { data: existingByPhone } = await supabase
      .from('customers')
      .select('id, phone')
      .in('phone', phones.length > 0 ? phones : ['__none__']);
    
    const phoneToId = new Map((existingByPhone || []).map(c => [c.phone, c.id]));
    console.log(`Clientes existentes por telefone: ${phoneToId.size}`);

    // 3. Filtra clientes que precisam ser criados
    const customersToInsert: any[] = [];
    const customerKeyToExistingId = new Map<string, string>();
    
    for (const [key, customer] of customersToCreate) {
      const existingId = cpfToId.get(customer.cpf_cnpj) || phoneToId.get(customer.phone);
      if (existingId) {
        customerKeyToExistingId.set(key, existingId);
      } else {
        customersToInsert.push({ ...customer, _key: key });
      }
    }

    console.log(`Clientes a criar: ${customersToInsert.length}`);

    // 4. Insere novos clientes em lotes
    let customersCreated = 0;
    const batchSize = 100;
    
    for (let i = 0; i < customersToInsert.length; i += batchSize) {
      const batch = customersToInsert.slice(i, i + batchSize);
      const toInsert = batch.map(({ _key, ...rest }) => rest);
      
      const { data: inserted, error } = await supabase
        .from('customers')
        .insert(toInsert)
        .select('id, cpf_cnpj, phone');
      
      if (error) {
        console.error('Erro ao inserir clientes:', error.message);
      } else if (inserted) {
        customersCreated += inserted.length;
        for (let j = 0; j < inserted.length; j++) {
          const customer = batch[j];
          customerKeyToExistingId.set(customer._key, inserted[j].id);
        }
      }
    }

    console.log(`Clientes criados: ${customersCreated}`);

    // 5. Atualiza transações com IDs dos clientes
    for (const tx of transactions) {
      if (isSellerFile && tx.seller_name) {
        const key = cleanCPF(tx.seller_cpf) || cleanPhone(tx.seller_phone) || tx.seller_name;
        tx.seller_customer_id = customerKeyToExistingId.get(key) || null;
      }
      if (isBuyerFile && tx.buyer_name) {
        const key = cleanCPF(tx.buyer_cpf) || cleanPhone(tx.buyer_phone) || tx.buyer_name;
        tx.buyer_customer_id = customerKeyToExistingId.get(key) || null;
      }
    }

    // 6. Busca transações existentes por placa + número para evitar duplicatas
    const plateNumberPairs = transactions
      .filter(tx => tx.plate && tx.vehicle_number)
      .map(tx => ({ plate: tx.plate, vehicle_number: tx.vehicle_number }));
    
    const existingTransactions = new Set<string>();
    
    if (plateNumberPairs.length > 0) {
      // Busca todas as placas envolvidas
      const plates = [...new Set(plateNumberPairs.map(p => p.plate))];
      
      const { data: existing } = await supabase
        .from('vehicle_transactions')
        .select('plate, vehicle_number')
        .in('plate', plates);
      
      if (existing) {
        for (const tx of existing) {
          if (tx.plate && tx.vehicle_number) {
            existingTransactions.add(`${tx.plate}|${tx.vehicle_number}`);
          }
        }
      }
    }

    console.log(`Transações existentes encontradas: ${existingTransactions.size}`);

    // Filtra transações que não são duplicatas
    const newTransactions = transactions.filter(tx => {
      if (!tx.plate || !tx.vehicle_number) return true; // Se não tem placa ou número, deixa passar
      const key = `${tx.plate}|${tx.vehicle_number}`;
      return !existingTransactions.has(key);
    });

    const skipped = transactions.length - newTransactions.length;
    console.log(`Transações novas: ${newTransactions.length}, Duplicatas ignoradas: ${skipped}`);

    // 7. Insere transações em lotes
    let inserted = 0;
    
    for (let i = 0; i < newTransactions.length; i += batchSize) {
      const batch = newTransactions.slice(i, i + batchSize);
      
      const { data, error } = await supabase
        .from('vehicle_transactions')
        .insert(batch)
        .select('id');

      if (error) {
        console.error(`Erro lote ${Math.floor(i / batchSize) + 1}:`, error.message);
        errors.push(`Lote ${Math.floor(i / batchSize) + 1}: ${error.message}`);
      } else {
        inserted += data?.length || 0;
      }
    }

    console.log(`Transações inseridas: ${inserted}`);

    return new Response(
      JSON.stringify({
        success: true,
        totalRows: rows.length,
        validTransactions: transactions.length,
        inserted,
        skipped,
        customersCreated,
        customersExisting: customerKeyToExistingId.size - customersCreated,
        fileType,
        errors: errors.slice(0, 20),
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