import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface RoundRobinSettings {
  id: string;
  is_globally_active: boolean;
  distribution_method: 'sequential' | 'weighted' | 'least_busy';
  response_time_limit_minutes: number;
  auto_reassign_enabled: boolean;
  penalty_enabled: boolean;
  penalty_type: 'skip_turn' | 'priority_reduction' | 'daily_limit_reduction';
  penalty_duration_hours: number;
  penalty_threshold: number;
  working_hours_enabled: boolean;
  working_hours_start: string;
  working_hours_end: string;
  working_days: number[];
  max_leads_per_cycle: number | null;
  notify_salesperson_on_assign: boolean;
  notify_manager_on_reassign: boolean;
  created_at: string;
  updated_at: string;
}

export interface RoundRobinPenalty {
  id: string;
  user_id: string;
  lead_id: string | null;
  reason: string | null;
  penalty_type: string;
  applied_at: string;
  expires_at: string | null;
  is_active: boolean;
  profile?: { full_name: string | null };
}

export function useRoundRobinSettings() {
  return useQuery({
    queryKey: ['round-robin-settings'],
    queryFn: async (): Promise<RoundRobinSettings | null> => {
      const { data, error } = await (supabase as any)
        .from('round_robin_settings')
        .select('*')
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
  });
}

export function useUpdateRoundRobinSettings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (updates: Partial<RoundRobinSettings>) => {
      const { data: existing } = await (supabase as any)
        .from('round_robin_settings')
        .select('id')
        .limit(1)
        .maybeSingle();

      if (existing) {
        const { data, error } = await (supabase as any)
          .from('round_robin_settings')
          .update(updates)
          .eq('id', existing.id)
          .select()
          .single();
        if (error) throw error;
        return data;
      } else {
        const { data, error } = await (supabase as any)
          .from('round_robin_settings')
          .insert(updates)
          .select()
          .single();
        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['round-robin-settings'] });
      toast({ title: 'Configurações salvas com sucesso!' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao salvar', description: error.message, variant: 'destructive' });
    },
  });
}

export function useRoundRobinPenalties() {
  return useQuery({
    queryKey: ['round-robin-penalties'],
    queryFn: async (): Promise<RoundRobinPenalty[]> => {
      const { data, error } = await (supabase as any)
        .from('round_robin_penalties')
        .select(`*, profile:profiles!user_id(full_name)`)
        .order('applied_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return data || [];
    },
  });
}

export function useClearPenalty() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (penaltyId: string) => {
      const { error } = await (supabase as any)
        .from('round_robin_penalties')
        .update({ is_active: false })
        .eq('id', penaltyId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['round-robin-penalties'] });
      queryClient.invalidateQueries({ queryKey: ['round-robin-config'] });
      toast({ title: 'Penalidade removida!' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    },
  });
}
