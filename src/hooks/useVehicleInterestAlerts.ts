import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface VehicleInterestAlert {
  id: string;
  lead_id: string | null;
  negotiation_id: string | null;
  customer_name: string;
  customer_phone: string;
  customer_email: string | null;
  vehicle_brand: string | null;
  vehicle_model: string | null;
  year_min: number | null;
  year_max: number | null;
  price_min: number | null;
  price_max: number | null;
  notes: string | null;
  status: 'active' | 'notified' | 'expired' | 'converted';
  notified_at: string | null;
  notified_vehicle_id: string | null;
  // Tracking fields
  responded_at: string | null;
  response_message: string | null;
  converted_at: string | null;
  conversion_sale_id: string | null;
  notification_count: number;
  last_notification_message: string | null;
  // Metadata
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface MatchingVehicle {
  id: string;
  brand: string;
  model: string;
  year_model: number;
  sale_price: number | null;
  images: string[] | null;
}

export function useVehicleInterestAlerts() {
  return useQuery({
    queryKey: ['vehicle-interest-alerts'],
    queryFn: async (): Promise<VehicleInterestAlert[]> => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('vehicle_interest_alerts')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as VehicleInterestAlert[];
    },
  });
}

// Statistics for reactivation tracking
export function useVehicleInterestAlertStats() {
  return useQuery({
    queryKey: ['vehicle-interest-alerts', 'stats'],
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('vehicle_interest_alerts')
        .select('status, responded_at, notified_at');

      if (error) throw error;
      
      const alerts = (data || []) as Array<{
        status: string;
        responded_at: string | null;
        notified_at: string | null;
      }>;
      
      const total = alerts.length;
      const active = alerts.filter(a => a.status === 'active').length;
      const notified = alerts.filter(a => a.status === 'notified').length;
      const responded = alerts.filter(a => a.responded_at !== null).length;
      const converted = alerts.filter(a => a.status === 'converted').length;
      const expired = alerts.filter(a => a.status === 'expired').length;
      
      // Calculate response rate (responded / notified)
      const respondedFromNotified = alerts.filter(a => 
        (a.status === 'notified' || a.status === 'converted') && a.responded_at !== null
      ).length;
      const totalNotified = alerts.filter(a => a.notified_at !== null).length;
      const responseRate = totalNotified > 0 ? (respondedFromNotified / totalNotified) * 100 : 0;
      
      // Conversion rate (converted / notified)
      const conversionRate = totalNotified > 0 ? (converted / totalNotified) * 100 : 0;
      
      return {
        total,
        active,
        notified,
        responded,
        converted,
        expired,
        responseRate: Math.round(responseRate),
        conversionRate: Math.round(conversionRate),
        pendingResponse: notified - respondedFromNotified,
      };
    },
  });
}

export function useActiveVehicleInterestAlerts() {
  return useQuery({
    queryKey: ['vehicle-interest-alerts', 'active'],
    queryFn: async (): Promise<VehicleInterestAlert[]> => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('vehicle_interest_alerts')
        .select('*')
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as VehicleInterestAlert[];
    },
  });
}

// Find matching vehicles for an alert
export function useMatchingVehicles(alert: VehicleInterestAlert | null) {
  return useQuery({
    queryKey: ['matching-vehicles', alert?.id],
    queryFn: async (): Promise<MatchingVehicle[]> => {
      if (!alert) return [];

      let query = supabase
        .from('vehicles')
        .select('id, brand, model, year_model, sale_price, images')
        .eq('status', 'disponivel');

      if (alert.vehicle_brand) {
        query = query.ilike('brand', `%${alert.vehicle_brand}%`);
      }
      if (alert.vehicle_model) {
        query = query.ilike('model', `%${alert.vehicle_model}%`);
      }
      if (alert.year_min) {
        query = query.gte('year_model', alert.year_min);
      }
      if (alert.year_max) {
        query = query.lte('year_model', alert.year_max);
      }
      if (alert.price_min) {
        query = query.gte('sale_price', alert.price_min);
      }
      if (alert.price_max) {
        query = query.lte('sale_price', alert.price_max);
      }

      const { data, error } = await query.limit(10);

      if (error) throw error;
      return (data || []) as MatchingVehicle[];
    },
    enabled: !!alert,
  });
}

interface CreateAlertInput {
  lead_id?: string;
  negotiation_id?: string;
  customer_name: string;
  customer_phone: string;
  customer_email?: string;
  vehicle_brand?: string;
  vehicle_model?: string;
  year_min?: number;
  year_max?: number;
  price_min?: number;
  price_max?: number;
  notes?: string;
}

export function useCreateVehicleInterestAlert() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateAlertInput) => {
      const { data: userData } = await supabase.auth.getUser();
      
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('vehicle_interest_alerts')
        .insert({
          ...input,
          created_by: userData.user?.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicle-interest-alerts'] });
      toast.success('Alerta de interesse criado com sucesso!');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao criar alerta: ${error.message}`);
    },
  });
}

interface UpdateAlertInput {
  id: string;
  status?: 'active' | 'notified' | 'expired' | 'converted';
  notified_at?: string;
  notified_vehicle_id?: string;
  notes?: string;
  // Tracking fields
  responded_at?: string;
  response_message?: string;
  converted_at?: string;
  conversion_sale_id?: string;
  notification_count?: number;
  last_notification_message?: string;
}

export function useUpdateVehicleInterestAlert() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...input }: UpdateAlertInput) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('vehicle_interest_alerts')
        .update(input)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicle-interest-alerts'] });
      toast.success('Alerta atualizado!');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao atualizar: ${error.message}`);
    },
  });
}

export function useDeleteVehicleInterestAlert() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from('vehicle_interest_alerts')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicle-interest-alerts'] });
      toast.success('Alerta removido!');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao remover: ${error.message}`);
    },
  });
}
