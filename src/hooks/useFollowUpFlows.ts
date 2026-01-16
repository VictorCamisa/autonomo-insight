import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { TriggerType } from '@/types/followUp';
import type { FollowUpStep } from '@/components/crm/FollowUpStepEditor';

interface FollowUpFlowRow {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  target_lead_status: string[] | null;
  target_lead_sources: string[] | null;
  target_vehicle_interests: string[] | null;
  target_negotiation_status: string[] | null;
  trigger_type: string;
  delay_days: number | null;
  delay_hours: number | null;
  specific_time: string | null;
  days_of_week: number[] | null;
  message_template: string;
  include_vehicle_info: boolean | null;
  include_salesperson_name: boolean | null;
  include_company_name: boolean | null;
  whatsapp_button_text: string | null;
  min_days_since_last_contact: number | null;
  max_contacts_per_lead: number | null;
  exclude_converted_leads: boolean | null;
  exclude_lost_leads: boolean | null;
  priority: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

interface FollowUpStepRow {
  id: string;
  flow_id: string;
  step_order: number;
  delay_minutes: number;
  message_template: string;
  stop_if_qualified: boolean;
  stop_if_assigned_to_salesperson: boolean;
  stop_if_responded: boolean;
  created_at: string;
  updated_at: string;
}

export interface FollowUpFlowWithSteps extends FollowUpFlowRow {
  steps: FollowUpStepRow[];
}

export function useFollowUpFlows() {
  return useQuery({
    queryKey: ['follow-up-flows'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('follow_up_flows')
        .select('*')
        .order('priority', { ascending: false });
      
      if (error) throw error;
      return (data as unknown as FollowUpFlowRow[]) || [];
    },
  });
}

export function useFollowUpFlowWithSteps(flowId: string | null) {
  return useQuery({
    queryKey: ['follow-up-flow', flowId],
    queryFn: async () => {
      if (!flowId) return null;
      
      const [flowResult, stepsResult] = await Promise.all([
        supabase.from('follow_up_flows').select('*').eq('id', flowId).single(),
        supabase.from('follow_up_steps').select('*').eq('flow_id', flowId).order('step_order'),
      ]);
      
      if (flowResult.error) throw flowResult.error;
      if (stepsResult.error) throw stepsResult.error;
      
      return {
        ...(flowResult.data as unknown as FollowUpFlowRow),
        steps: (stepsResult.data as unknown as FollowUpStepRow[]) || [],
      };
    },
    enabled: !!flowId,
  });
}

export function useFollowUpSteps(flowId: string | null) {
  return useQuery({
    queryKey: ['follow-up-steps', flowId],
    queryFn: async () => {
      if (!flowId) return [];
      
      const { data, error } = await supabase
        .from('follow_up_steps')
        .select('*')
        .eq('flow_id', flowId)
        .order('step_order');
      
      if (error) throw error;
      return (data as unknown as FollowUpStepRow[]) || [];
    },
    enabled: !!flowId,
  });
}

export interface CreateFollowUpFlowInput {
  name: string;
  description?: string;
  is_active?: boolean;
  target_lead_status?: string[];
  target_lead_sources?: string[];
  target_vehicle_interests?: string[];
  target_negotiation_status?: string[];
  trigger_type?: TriggerType;
  delay_days?: number;
  delay_hours?: number;
  specific_time?: string;
  days_of_week?: number[];
  message_template?: string;
  include_vehicle_info?: boolean;
  include_salesperson_name?: boolean;
  include_company_name?: boolean;
  whatsapp_button_text?: string;
  min_days_since_last_contact?: number;
  max_contacts_per_lead?: number;
  exclude_converted_leads?: boolean;
  exclude_lost_leads?: boolean;
  priority?: number;
  steps?: FollowUpStep[];
}

export function useCreateFollowUpFlow() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (input: CreateFollowUpFlowInput) => {
      const { steps, ...flowData } = input;
      
      // Garante um message_template default se não tiver steps
      const sanitizedInput = {
        ...flowData,
        specific_time: flowData.specific_time || null,
        message_template: flowData.message_template || (steps?.[0]?.message_template || 'Mensagem padrão'),
      };
      
      // Cria o fluxo
      const { data: flow, error: flowError } = await supabase
        .from('follow_up_flows')
        .insert(sanitizedInput as never)
        .select()
        .single();
      
      if (flowError) throw flowError;
      
      // Cria os passos
      if (steps && steps.length > 0) {
        const stepsToInsert = steps.map((step, index) => ({
          flow_id: (flow as { id: string }).id,
          step_order: index + 1,
          delay_minutes: step.delay_minutes,
          message_template: step.message_template,
          stop_if_qualified: step.stop_if_qualified,
          stop_if_assigned_to_salesperson: step.stop_if_assigned_to_salesperson,
          stop_if_responded: step.stop_if_responded,
        }));
        
        const { error: stepsError } = await supabase
          .from('follow_up_steps')
          .insert(stepsToInsert as never[]);
        
        if (stepsError) throw stepsError;
      }
      
      return flow;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['follow-up-flows'] });
      queryClient.invalidateQueries({ queryKey: ['follow-up-steps'] });
      toast.success('Fluxo de follow-up criado com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao criar fluxo: ' + error.message);
    },
  });
}

export interface UpdateFollowUpFlowInput extends Partial<CreateFollowUpFlowInput> {
  id: string;
}

export function useUpdateFollowUpFlow() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, steps, ...input }: UpdateFollowUpFlowInput) => {
      // Convert empty string to null for time field
      const sanitizedInput = {
        ...input,
        specific_time: input.specific_time || null,
      };
      
      // Atualiza o fluxo
      const { data, error } = await supabase
        .from('follow_up_flows')
        .update(sanitizedInput as never)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      
      // Atualiza os passos se fornecidos
      if (steps) {
        // Remove passos antigos
        await supabase.from('follow_up_steps').delete().eq('flow_id', id);
        
        // Insere novos passos
        if (steps.length > 0) {
          const stepsToInsert = steps.map((step, index) => ({
            flow_id: id,
            step_order: index + 1,
            delay_minutes: step.delay_minutes,
            message_template: step.message_template,
            stop_if_qualified: step.stop_if_qualified,
            stop_if_assigned_to_salesperson: step.stop_if_assigned_to_salesperson,
            stop_if_responded: step.stop_if_responded,
          }));
          
          const { error: stepsError } = await supabase
            .from('follow_up_steps')
            .insert(stepsToInsert as never[]);
          
          if (stepsError) throw stepsError;
        }
      }
      
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['follow-up-flows'] });
      queryClient.invalidateQueries({ queryKey: ['follow-up-steps'] });
      queryClient.invalidateQueries({ queryKey: ['follow-up-flow'] });
      toast.success('Fluxo de follow-up atualizado!');
    },
    onError: (error) => {
      toast.error('Erro ao atualizar fluxo: ' + error.message);
    },
  });
}

export function useDeleteFollowUpFlow() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('follow_up_flows')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['follow-up-flows'] });
      queryClient.invalidateQueries({ queryKey: ['follow-up-steps'] });
      toast.success('Fluxo de follow-up excluído!');
    },
    onError: (error) => {
      toast.error('Erro ao excluir fluxo: ' + error.message);
    },
  });
}

export function useToggleFollowUpFlow() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { data, error } = await supabase
        .from('follow_up_flows')
        .update({ is_active } as never)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data as unknown as { is_active: boolean };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['follow-up-flows'] });
      toast.success(data?.is_active ? 'Fluxo ativado!' : 'Fluxo desativado!');
    },
    onError: (error) => {
      toast.error('Erro ao alterar status: ' + error.message);
    },
  });
}
