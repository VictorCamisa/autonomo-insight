import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEffect } from 'react';

export interface LeadQualificationData {
  id: string;
  lead_id: string;
  vehicle_interest: string | null;
  budget: number | null;
  desired_installment: number | null;
  down_payment: number | null;
  has_trade_in: boolean | null;
  trade_in_vehicle: string | null;
  clean_credit: boolean | null;
  cpf: string | null;
  additional_info: Record<string, unknown>;
  is_qualified: boolean;
  qualified_at: string | null;
  message_count: number;
  created_at: string;
  updated_at: string;
}

export interface AIConversation {
  id: string;
  lead_id: string;
  agent_id: string;
  session_id: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface AIMessage {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant';
  content: string | null;
  thinking: string | null;
  created_at: string;
}

// Fetch qualification data for a lead
export function useLeadQualification(leadId: string | undefined) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['lead-qualification', leadId],
    queryFn: async () => {
      if (!leadId) return null;
      
      const { data, error } = await supabase
        .from('lead_qualification_data')
        .select('*')
        .eq('lead_id', leadId)
        .maybeSingle();

      if (error) throw error;
      return data as LeadQualificationData | null;
    },
    enabled: !!leadId,
    refetchInterval: 5000, // Poll every 5 seconds as fallback
  });

  // Real-time subscription for qualification updates
  useEffect(() => {
    if (!leadId) return;

    const channel = supabase
      .channel(`lead-qual-${leadId}`)
      .on(
        'postgres_changes',
        { 
          event: '*', 
          schema: 'public', 
          table: 'lead_qualification_data',
          filter: `lead_id=eq.${leadId}`
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['lead-qualification', leadId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [leadId, queryClient]);

  return query;
}

// Fetch AI conversation for a lead
export function useLeadAIConversation(leadId: string | undefined) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['lead-ai-conversation', leadId],
    queryFn: async () => {
      if (!leadId) return null;

      const { data, error } = await supabase
        .from('ai_agent_conversations')
        .select('*')
        .eq('lead_id', leadId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data as AIConversation | null;
    },
    enabled: !!leadId,
  });

  // Real-time subscription for conversation updates
  useEffect(() => {
    if (!leadId) return;

    const channel = supabase
      .channel(`lead-ai-conv-${leadId}`)
      .on(
        'postgres_changes',
        { 
          event: '*', 
          schema: 'public', 
          table: 'ai_agent_conversations',
          filter: `lead_id=eq.${leadId}`
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['lead-ai-conversation', leadId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [leadId, queryClient]);

  return query;
}

// Fetch AI messages for a conversation
export function useAIConversationMessages(conversationId: string | undefined) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['ai-conversation-messages', conversationId],
    queryFn: async () => {
      if (!conversationId) return [];

      const { data, error } = await supabase
        .from('ai_agent_messages')
        .select('id, conversation_id, role, content, thinking, created_at')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data as AIMessage[];
    },
    enabled: !!conversationId,
    refetchInterval: 3000, // Poll every 3 seconds for new messages
  });

  // Real-time subscription for new messages
  useEffect(() => {
    if (!conversationId) return;

    const channel = supabase
      .channel(`ai-messages-${conversationId}`)
      .on(
        'postgres_changes',
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'ai_agent_messages',
          filter: `conversation_id=eq.${conversationId}`
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['ai-conversation-messages', conversationId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, queryClient]);

  return query;
}

// Calculate qualification progress
export function calculateQualificationProgress(data: LeadQualificationData | null): {
  percentage: number;
  collectedFields: string[];
  missingFields: string[];
} {
  if (!data) {
    return { percentage: 0, collectedFields: [], missingFields: ['Todos os dados'] };
  }

  const fields = [
    { key: 'vehicle_interest', label: 'Veículo de interesse', value: data.vehicle_interest },
    { key: 'budget', label: 'Orçamento', value: data.budget },
    { key: 'down_payment', label: 'Entrada', value: data.down_payment },
    { key: 'desired_installment', label: 'Parcela desejada', value: data.desired_installment },
    { key: 'has_trade_in', label: 'Tem veículo para troca', value: data.has_trade_in },
    { key: 'trade_in_vehicle', label: 'Veículo de troca', value: data.trade_in_vehicle },
    { key: 'clean_credit', label: 'Nome limpo', value: data.clean_credit },
    { key: 'cpf', label: 'CPF', value: data.cpf },
  ];

  const collectedFields = fields.filter(f => f.value !== null && f.value !== undefined).map(f => f.label);
  const missingFields = fields.filter(f => f.value === null || f.value === undefined).map(f => f.label);
  
  const percentage = Math.round((collectedFields.length / fields.length) * 100);

  return { percentage, collectedFields, missingFields };
}
