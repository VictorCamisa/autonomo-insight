import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Vehicle, VehicleCost, VehicleDRE, VehicleStatus, VehicleCostType } from '@/types/inventory';
import { toast } from 'sonner';
import { syncVehiclePurchase, syncVehicleCost } from './useFinancialSync';

// Shared query options for better caching
const vehicleQueryOptions = {
  staleTime: 1000 * 60 * 5, // 5 minutes
  gcTime: 1000 * 60 * 15, // 15 minutes
};

export function useVehicles() {
  return useQuery({
    queryKey: ['vehicles'],
    queryFn: async (): Promise<Vehicle[]> => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: vehicles, error } = await (supabase as any)
        .from('vehicles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Buscar imagens da tabela vehicle_images para todos os veículos
      const vehicleIds = (vehicles || []).map((v: Vehicle) => v.id);
      
      let imagesByVehicle: Record<string, string[]> = {};
      
      if (vehicleIds.length > 0) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: images } = await (supabase as any)
          .from('vehicle_images')
          .select('vehicle_id, image_url, is_cover, display_order')
          .in('vehicle_id', vehicleIds)
          .order('display_order', { ascending: true });

        // Agrupar imagens por veículo (filtrando URLs inválidas)
        (images || []).forEach((img: { vehicle_id: string; image_url: string; is_cover: boolean; display_order: number }) => {
          if (!img.image_url || !img.image_url.startsWith('http')) return;
          
          if (!imagesByVehicle[img.vehicle_id]) {
            imagesByVehicle[img.vehicle_id] = [];
          }
          // Se for capa, colocar primeiro
          if (img.is_cover) {
            imagesByVehicle[img.vehicle_id].unshift(img.image_url);
          } else {
            imagesByVehicle[img.vehicle_id].push(img.image_url);
          }
        });
      }

      // Priorizar imagens da tabela vehicle_images, fallback para campo images
      return (vehicles || []).map((vehicle: Vehicle) => ({
        ...vehicle,
        images: imagesByVehicle[vehicle.id]?.length > 0 
          ? imagesByVehicle[vehicle.id] 
          : vehicle.images || null,
      }));
    },
    ...vehicleQueryOptions,
  });
}

export function useVehicle(id: string) {
  return useQuery({
    queryKey: ['vehicles', id],
    queryFn: async (): Promise<Vehicle | null> => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: vehicle, error } = await (supabase as any)
        .from('vehicles')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (error) throw error;
      if (!vehicle) return null;

      // Buscar imagens da tabela vehicle_images
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: images } = await (supabase as any)
        .from('vehicle_images')
        .select('image_url, is_cover, display_order')
        .eq('vehicle_id', id)
        .order('display_order', { ascending: true });

      // Ordenar com capa primeiro, filtrar URLs inválidas
      const sortedImages = (images || [])
        .filter((img: { image_url: string }) => img.image_url && img.image_url.startsWith('http'))
        .sort((a: { is_cover: boolean }, b: { is_cover: boolean }) => 
          (b.is_cover ? 1 : 0) - (a.is_cover ? 1 : 0)
        )
        .map((img: { image_url: string }) => img.image_url);

      return {
        ...vehicle,
        images: sortedImages.length > 0 ? sortedImages : vehicle.images || null,
      } as Vehicle;
    },
    enabled: !!id,
    ...vehicleQueryOptions,
  });
}

export function useVehicleDRE(id?: string) {
  return useQuery({
    queryKey: ['vehicle-dre', id],
    queryFn: async (): Promise<VehicleDRE | null> => {
      if (!id) return null;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('vehicle_dre')
        .select('*')
        .eq('id', id)
        .maybeSingle();
      
      if (error) throw error;
      return data as VehicleDRE | null;
    },
    enabled: !!id,
    ...vehicleQueryOptions,
  });
}

export function useAllVehicleDRE() {
  return useQuery({
    queryKey: ['vehicle-dre-all'],
    queryFn: async (): Promise<VehicleDRE[]> => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('vehicle_dre')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return (data || []) as VehicleDRE[];
    },
    ...vehicleQueryOptions,
  });
}

export function useVehicleCosts(vehicleId: string) {
  return useQuery({
    queryKey: ['vehicle-costs', vehicleId],
    queryFn: async (): Promise<VehicleCost[]> => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('vehicle_costs')
        .select('*')
        .eq('vehicle_id', vehicleId)
        .order('cost_date', { ascending: false });

      if (error) throw error;
      return (data || []) as VehicleCost[];
    },
    enabled: !!vehicleId,
    ...vehicleQueryOptions,
  });
}

interface CreateVehicleInput {
  brand: string;
  model: string;
  version?: string;
  year_fabrication: number;
  year_model: number;
  color: string;
  plate?: string;
  renavam?: string;
  chassis?: string;
  km: number;
  fuel_type?: string;
  transmission?: string;
  doors?: number;
  purchase_price?: number;
  purchase_date?: string;
  purchase_source?: string;
  fipe_price_at_purchase?: number;
  sale_price?: number;
  minimum_price?: number;
  expected_margin_percent?: number;
  expected_sale_days?: number;
  estimated_maintenance?: number;
  estimated_cleaning?: number;
  estimated_documentation?: number;
  estimated_other_costs?: number;
  status?: VehicleStatus;
  notes?: string;
  featured?: boolean;
  images?: string[];
}

export function useCreateVehicle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateVehicleInput) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('vehicles')
        .insert({
          ...input,
          created_by: user?.id,
        })
        .select()
        .single();

      if (error) throw error;
      
      // Sincronizar compra como despesa financeira
      if (data && input.purchase_price && input.purchase_price > 0) {
        await syncVehiclePurchase({
          id: data.id,
          brand: input.brand,
          model: input.model,
          purchase_price: input.purchase_price,
          purchase_date: input.purchase_date,
        });
      }
      
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      queryClient.invalidateQueries({ queryKey: ['vehicle-dre'] });
      queryClient.invalidateQueries({ queryKey: ['public-vehicles'] });
      queryClient.invalidateQueries({ queryKey: ['featured-vehicles'] });
      queryClient.invalidateQueries({ queryKey: ['financial-transactions'] });
      toast.success('Veículo cadastrado com sucesso!');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao cadastrar veículo: ${error.message}`);
    },
  });
}

export function useUpdateVehicle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...input }: { id: string } & Partial<CreateVehicleInput>) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('vehicles')
        .update(input)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      queryClient.invalidateQueries({ queryKey: ['vehicle-dre'] });
      queryClient.invalidateQueries({ queryKey: ['public-vehicles'] });
      queryClient.invalidateQueries({ queryKey: ['featured-vehicles'] });
      toast.success('Veículo atualizado com sucesso!');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao atualizar veículo: ${error.message}`);
    },
  });
}

export function useDeleteVehicle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from('vehicles')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      queryClient.invalidateQueries({ queryKey: ['vehicle-dre'] });
      toast.success('Veículo excluído com sucesso!');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao excluir veículo: ${error.message}`);
    },
  });
}

interface CreateVehicleCostInput {
  vehicle_id: string;
  cost_type: VehicleCostType;
  description: string;
  amount: number;
  cost_date?: string;
  receipt_url?: string;
}

export function useCreateVehicleCost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateVehicleCostInput) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('vehicle_costs')
        .insert({
          ...input,
          created_by: user?.id,
        })
        .select()
        .single();

      if (error) throw error;
      
      // Buscar info do veículo para descrição
      const { data: vehicle } = await (supabase as any)
        .from('vehicles')
        .select('brand, model')
        .eq('id', input.vehicle_id)
        .maybeSingle();
      
      // Sincronizar custo como despesa financeira
      if (data) {
        await syncVehicleCost({
          id: data.id,
          vehicle_id: input.vehicle_id,
          cost_type: input.cost_type,
          description: input.description,
          amount: input.amount,
          cost_date: input.cost_date,
        }, vehicle);
      }
      
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['vehicle-costs', variables.vehicle_id] });
      queryClient.invalidateQueries({ queryKey: ['vehicle-dre'] });
      queryClient.invalidateQueries({ queryKey: ['financial-transactions'] });
      toast.success('Custo adicionado com sucesso!');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao adicionar custo: ${error.message}`);
    },
  });
}

export function useDeleteVehicleCost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, vehicleId }: { id: string; vehicleId: string }) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from('vehicle_costs')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return { vehicleId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['vehicle-costs', data.vehicleId] });
      queryClient.invalidateQueries({ queryKey: ['vehicle-dre'] });
      toast.success('Custo excluído com sucesso!');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao excluir custo: ${error.message}`);
    },
  });
}
