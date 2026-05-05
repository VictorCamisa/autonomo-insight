import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

export interface RoundRobinConfig {
  id: string;
  salesperson_id: string;
  is_active: boolean;
  priority: number;
  max_leads_per_day: number | null;
  current_leads_today: number;
  last_assigned_at: string | null;
  total_leads_assigned: number;
  created_at: string;
  updated_at: string;
  salesperson?: {
    id: string;
    full_name: string | null;
  };
}

export interface LeadAssignment {
  id: string;
  lead_id: string;
  salesperson_id: string;
  assigned_at: string;
  assigned_by: string | null;
  assignment_type: string;
  notes: string | null;
  lead?: {
    id: string;
    name: string;
    phone: string;
    source: string;
    status: string;
  };
  salesperson?: {
    id: string;
    full_name: string | null;
  };
}

export interface SalespersonWithRole {
  id: string;
  full_name: string | null;
  role: string | null;
  is_in_round_robin: boolean;
  round_robin_config?: RoundRobinConfig;
}

export function useRoundRobinConfig() {
  return useQuery({
    queryKey: ['round-robin-config'],
    queryFn: async (): Promise<RoundRobinConfig[]> => {
      const { data, error } = await (supabase as any)
        .from('round_robin_config')
        .select(`
          *,
          salesperson:profiles!salesperson_id(id, full_name)
        `)
        .order('priority', { ascending: false });

      if (error) throw error;
      return data || [];
    },
  });
}

export function useSalespeopleWithRoles() {
  return useQuery({
    queryKey: ['salespeople-with-roles'],
    queryFn: async (): Promise<SalespersonWithRole[]> => {
      const { data: profiles, error: profilesError } = await (supabase as any)
        .from('profiles')
        .select('id, full_name');

      if (profilesError) throw profilesError;

      const { data: roles, error: rolesError } = await (supabase as any)
        .from('user_roles')
        .select('user_id, role');

      if (rolesError) throw rolesError;

      const { data: rrConfigs, error: rrError } = await (supabase as any)
        .from('round_robin_config')
        .select('*');

      if (rrError) throw rrError;

      return (profiles || []).map((p: any) => {
        const userRole = (roles || []).find((r: any) => r.user_id === p.id);
        const rrConfig = (rrConfigs || []).find((r: any) => r.salesperson_id === p.id);
        
        return {
          id: p.id,
          full_name: p.full_name,
          role: userRole?.role || null,
          is_in_round_robin: !!rrConfig,
          round_robin_config: rrConfig,
        };
      });
    },
  });
}

export function useLeadAssignments() {
  return useQuery({
    queryKey: ['lead-assignments'],
    queryFn: async (): Promise<LeadAssignment[]> => {
      const { data, error } = await (supabase as any)
        .from('lead_assignments')
        .select(`
          *,
          lead:leads(id, name, phone, source, status),
          salesperson:profiles!salesperson_id(id, full_name)
        `)
        .order('assigned_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      return data || [];
    },
  });
}

export function useAddToRoundRobin() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { 
      salesperson_id: string; 
      priority?: number; 
      max_leads_per_day?: number | null 
    }) => {
      const { data, error } = await (supabase as any)
        .from('round_robin_config')
        .insert({
          salesperson_id: input.salesperson_id,
          priority: input.priority || 0,
          max_leads_per_day: input.max_leads_per_day,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['round-robin-config'] });
      queryClient.invalidateQueries({ queryKey: ['salespeople-with-roles'] });
      toast({ title: 'Vendedor adicionado ao Round Robin!' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao adicionar', description: error.message, variant: 'destructive' });
    },
  });
}

export function useUpdateRoundRobinConfig() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { 
      id: string; 
      is_active?: boolean;
      priority?: number; 
      max_leads_per_day?: number | null 
    }) => {
      const { id, ...updates } = input;
      const { data, error } = await (supabase as any)
        .from('round_robin_config')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['round-robin-config'] });
      queryClient.invalidateQueries({ queryKey: ['salespeople-with-roles'] });
      toast({ title: 'Configuração atualizada!' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao atualizar', description: error.message, variant: 'destructive' });
    },
  });
}

export function useRemoveFromRoundRobin() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from('round_robin_config')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['round-robin-config'] });
      queryClient.invalidateQueries({ queryKey: ['salespeople-with-roles'] });
      toast({ title: 'Vendedor removido do Round Robin!' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao remover', description: error.message, variant: 'destructive' });
    },
  });
}

export function useAssignSalespersonRole() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { user_id: string; role: 'vendedor' | 'gerente' | 'marketing' }) => {
      const { data: existingRole } = await (supabase as any)
        .from('user_roles')
        .select('id')
        .eq('user_id', input.user_id)
        .maybeSingle();

      if (existingRole) {
        const { error } = await (supabase as any)
          .from('user_roles')
          .update({ role: input.role })
          .eq('user_id', input.user_id);
        if (error) throw error;
      } else {
        const { error } = await (supabase as any)
          .from('user_roles')
          .insert({ user_id: input.user_id, role: input.role });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['salespeople-with-roles'] });
      toast({ title: 'Função atribuída com sucesso!' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao atribuir função', description: error.message, variant: 'destructive' });
    },
  });
}

export function useManualLeadAssignment() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { lead_id: string; salesperson_id: string; notes?: string }) => {
      // Update the lead's assigned_to
      const { error: leadError } = await (supabase as any)
        .from('leads')
        .update({ assigned_to: input.salesperson_id })
        .eq('id', input.lead_id);

      if (leadError) throw leadError;

      // Create assignment record
      const { error: assignError } = await (supabase as any)
        .from('lead_assignments')
        .insert({
          lead_id: input.lead_id,
          salesperson_id: input.salesperson_id,
          assignment_type: 'manual',
          notes: input.notes,
        });

      if (assignError) throw assignError;

      // Fire-and-forget WhatsApp notifications (never blocks the mutation)
      supabase.functions
        .invoke('notify-lead-assignment', {
          body: { lead_id: input.lead_id, salesperson_id: input.salesperson_id },
        })
        .catch((err: unknown) => console.warn('[LeadAssignment] Notification error:', err));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lead-assignments'] });
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      toast({ title: 'Lead atribuído com sucesso!' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao atribuir lead', description: error.message, variant: 'destructive' });
    },
  });
}

export function useCreateUser() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { 
      email: string; 
      password: string; 
      full_name: string; 
      role: 'vendedor' | 'gerente' | 'marketing';
      add_to_round_robin?: boolean;
    }) => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('Você precisa estar logado');
      }

      const response = await fetch(`${SUPABASE_URL}/functions/v1/create-user`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          email: input.email,
          password: input.password,
          full_name: input.full_name,
          role: input.role,
        }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Erro ao criar usuário');
      }

      if (input.add_to_round_robin && input.role === 'vendedor' && data.user?.id) {
        await (supabase as any)
          .from('round_robin_config')
          .insert({ salesperson_id: data.user.id });
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['salespeople-with-roles'] });
      queryClient.invalidateQueries({ queryKey: ['round-robin-config'] });
      toast({ title: 'Usuário criado com sucesso!' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao criar usuário', description: error.message, variant: 'destructive' });
    },
  });
}
