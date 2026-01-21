import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface VehicleTransaction {
  id: string;
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
  purchase_price: number | null;
  buyer_name: string | null;
  buyer_phone: string | null;
  buyer_cpf: string | null;
  buyer_address: string | null;
  sale_date: string | null;
  sale_price: number | null;
  km_out: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

// Busca todas as transações
export function useVehicleTransactions() {
  return useQuery({
    queryKey: ['vehicle-transactions'],
    queryFn: async (): Promise<VehicleTransaction[]> => {
      const { data, error } = await supabase
        .from('vehicle_transactions')
        .select('*')
        .order('vehicle_number', { ascending: false });

      if (error) throw error;
      return data as VehicleTransaction[];
    },
    staleTime: 30000,
  });
}

// Busca transações de compra (onde tem vendedor - de quem a loja comprou)
export function usePurchasedTransactions() {
  return useQuery({
    queryKey: ['vehicle-transactions-purchased'],
    queryFn: async (): Promise<VehicleTransaction[]> => {
      const { data, error } = await supabase
        .from('vehicle_transactions')
        .select('*')
        .not('seller_name', 'is', null)
        .order('purchase_date', { ascending: false, nullsFirst: false });

      if (error) throw error;
      return data as VehicleTransaction[];
    },
    staleTime: 30000,
  });
}

// Busca transações de venda (onde tem comprador - para quem a loja vendeu)
export function useSoldTransactions() {
  return useQuery({
    queryKey: ['vehicle-transactions-sold'],
    queryFn: async (): Promise<VehicleTransaction[]> => {
      const { data, error } = await supabase
        .from('vehicle_transactions')
        .select('*')
        .not('buyer_name', 'is', null)
        .order('sale_date', { ascending: false, nullsFirst: false });

      if (error) throw error;
      return data as VehicleTransaction[];
    },
    staleTime: 30000,
  });
}

// Mutation para importar transações
export function useImportTransactions() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ rows, dryRun = false }: { rows: any[]; dryRun?: boolean }) => {
      const { data, error } = await supabase.functions.invoke('import-vehicle-transactions', {
        body: { rows, dryRun },
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error || 'Erro ao importar');
      
      return data;
    },
    onSuccess: (data, variables) => {
      if (!variables.dryRun) {
        queryClient.invalidateQueries({ queryKey: ['vehicle-transactions'] });
        queryClient.invalidateQueries({ queryKey: ['vehicle-transactions-purchased'] });
        queryClient.invalidateQueries({ queryKey: ['vehicle-transactions-sold'] });
        toast.success(`${data.inserted} transações importadas com sucesso!`);
      }
    },
    onError: (error: Error) => {
      toast.error(`Erro na importação: ${error.message}`);
    },
  });
}

// Mutation para deletar todas as transações (reset)
export function useDeleteAllTransactions() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('vehicle_transactions')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Deleta tudo

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicle-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['vehicle-transactions-purchased'] });
      queryClient.invalidateQueries({ queryKey: ['vehicle-transactions-sold'] });
      toast.success('Histórico limpo com sucesso');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao limpar: ${error.message}`);
    },
  });
}
