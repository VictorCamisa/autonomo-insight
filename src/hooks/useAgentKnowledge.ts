import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { AIAgentKnowledge, AIAgentKnowledgeFormData } from '@/types/ai-agents';

// =============================================
// KNOWLEDGE BASE CRUD
// =============================================

export function useAgentKnowledge(agentId: string | undefined) {
  return useQuery({
    queryKey: ['ai-agent-knowledge', agentId],
    queryFn: async () => {
      if (!agentId) return [];
      
      const { data, error } = await (supabase as any)
        .from('ai_agent_knowledge')
        .select('*')
        .eq('agent_id', agentId)
        .order('category', { ascending: true })
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as AIAgentKnowledge[];
    },
    enabled: !!agentId,
  });
}

export function useCreateAgentKnowledge() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: AIAgentKnowledgeFormData) => {
      const { data: knowledge, error } = await (supabase as any)
        .from('ai_agent_knowledge')
        .insert(data)
        .select()
        .single();

      if (error) throw error;
      return knowledge as AIAgentKnowledge;
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['ai-agent-knowledge', result.agent_id] });
      toast.success('Conhecimento adicionado!');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao adicionar conhecimento: ${error.message}`);
    },
  });
}

export function useUpdateAgentKnowledge() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<AIAgentKnowledgeFormData> }) => {
      const { data: knowledge, error } = await (supabase as any)
        .from('ai_agent_knowledge')
        .update({ ...data, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return knowledge as AIAgentKnowledge;
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['ai-agent-knowledge', result.agent_id] });
      toast.success('Conhecimento atualizado!');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao atualizar conhecimento: ${error.message}`);
    },
  });
}

export function useDeleteAgentKnowledge() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, agentId }: { id: string; agentId: string }) => {
      const { error } = await (supabase as any)
        .from('ai_agent_knowledge')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return agentId;
    },
    onSuccess: (agentId) => {
      queryClient.invalidateQueries({ queryKey: ['ai-agent-knowledge', agentId] });
      toast.success('Conhecimento removido!');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao remover conhecimento: ${error.message}`);
    },
  });
}

export function useToggleAgentKnowledge() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, is_active, agentId }: { id: string; is_active: boolean; agentId: string }) => {
      const { data: knowledge, error } = await (supabase as any)
        .from('ai_agent_knowledge')
        .update({ is_active, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return { knowledge: knowledge as AIAgentKnowledge, agentId };
    },
    onSuccess: ({ agentId }) => {
      queryClient.invalidateQueries({ queryKey: ['ai-agent-knowledge', agentId] });
    },
    onError: (error: Error) => {
      toast.error(`Erro ao atualizar: ${error.message}`);
    },
  });
}
