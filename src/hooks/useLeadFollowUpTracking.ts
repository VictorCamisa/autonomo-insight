import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface FollowUpTracking {
  id: string;
  lead_id: string | null;
  negotiation_id: string | null;
  flow_id: string | null;
  current_step: number | null;
  status: string | null;
  next_step_at: string | null;
  last_step_at: string | null;
  started_at: string | null;
  reactivated_count: number | null;
  created_at: string | null;
  updated_at: string | null;
  flow?: {
    id: string;
    name: string;
  } | null;
}

export interface FollowUpTrackingWithFlow extends FollowUpTracking {
  flow: {
    id: string;
    name: string;
    steps_count?: number;
  } | null;
}

// Busca todos os trackings ativos
export function useActiveFollowUpTracking() {
  return useQuery({
    queryKey: ['follow-up-tracking', 'active'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lead_follow_up_tracking')
        .select(`
          *,
          flow:follow_up_flows(id, name)
        `)
        .eq('status', 'active')
        .order('next_step_at', { ascending: true, nullsFirst: false });

      if (error) throw error;
      return (data || []) as FollowUpTrackingWithFlow[];
    },
  });
}

// Busca tracking por negociação
export function useFollowUpTrackingByNegotiation(negotiationId: string | null) {
  return useQuery({
    queryKey: ['follow-up-tracking', 'negotiation', negotiationId],
    queryFn: async () => {
      if (!negotiationId) return null;
      
      const { data, error } = await supabase
        .from('lead_follow_up_tracking')
        .select(`
          *,
          flow:follow_up_flows(id, name)
        `)
        .eq('negotiation_id', negotiationId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data as FollowUpTrackingWithFlow | null;
    },
    enabled: !!negotiationId,
  });
}

// Busca tracking por lead
export function useFollowUpTrackingByLead(leadId: string | null) {
  return useQuery({
    queryKey: ['follow-up-tracking', 'lead', leadId],
    queryFn: async () => {
      if (!leadId) return [];
      
      const { data, error } = await supabase
        .from('lead_follow_up_tracking')
        .select(`
          *,
          flow:follow_up_flows(id, name)
        `)
        .eq('lead_id', leadId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as FollowUpTrackingWithFlow[];
    },
    enabled: !!leadId,
  });
}

// Busca estatísticas de follow-up
export function useFollowUpStats() {
  return useQuery({
    queryKey: ['follow-up-stats'],
    queryFn: async () => {
      const { data: tracking, error } = await supabase
        .from('lead_follow_up_tracking')
        .select('status, current_step');

      if (error) throw error;

      const stats = {
        active: 0,
        completed: 0,
        reactivated: 0,
        paused: 0,
        totalStepsExecuted: 0,
      };

      (tracking || []).forEach((t) => {
        if (t.status === 'active') stats.active++;
        else if (t.status === 'completed') stats.completed++;
        else if (t.status === 'reactivated') stats.reactivated++;
        else if (t.status === 'paused') stats.paused++;
        
        stats.totalStepsExecuted += t.current_step || 0;
      });

      return stats;
    },
  });
}

// Busca próximos follow-ups agendados
export function useUpcomingFollowUps(limit = 10) {
  return useQuery({
    queryKey: ['follow-up-tracking', 'upcoming', limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lead_follow_up_tracking')
        .select(`
          *,
          flow:follow_up_flows(id, name),
          lead:leads(id, name, phone),
          negotiation:negotiations(id, status)
        `)
        .eq('status', 'active')
        .not('next_step_at', 'is', null)
        .order('next_step_at', { ascending: true })
        .limit(limit);

      if (error) throw error;
      return data || [];
    },
  });
}

// Pausar um tracking de follow-up
export function usePauseFollowUpTracking() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (trackingId: string) => {
      const { data, error } = await supabase
        .from('lead_follow_up_tracking')
        .update({ 
          status: 'paused',
          updated_at: new Date().toISOString(),
        })
        .eq('id', trackingId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['follow-up-tracking'] });
      toast.success('Follow-up pausado');
    },
    onError: (error) => {
      toast.error('Erro ao pausar follow-up: ' + error.message);
    },
  });
}

// Retomar um tracking pausado
export function useResumeFollowUpTracking() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (trackingId: string) => {
      const { data, error } = await supabase
        .from('lead_follow_up_tracking')
        .update({ 
          status: 'active',
          updated_at: new Date().toISOString(),
        })
        .eq('id', trackingId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['follow-up-tracking'] });
      toast.success('Follow-up retomado');
    },
    onError: (error) => {
      toast.error('Erro ao retomar follow-up: ' + error.message);
    },
  });
}

// Cancelar um tracking
export function useCancelFollowUpTracking() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (trackingId: string) => {
      const { error } = await supabase
        .from('lead_follow_up_tracking')
        .delete()
        .eq('id', trackingId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['follow-up-tracking'] });
      toast.success('Follow-up cancelado');
    },
    onError: (error) => {
      toast.error('Erro ao cancelar follow-up: ' + error.message);
    },
  });
}
