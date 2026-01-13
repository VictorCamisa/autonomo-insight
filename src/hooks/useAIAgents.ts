import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { 
  AIAgent, 
  AIAgentFormData, 
  AIAgentTool, 
  AIAgentToolFormData,
  AIAgentDataSource,
  AIAgentDataSourceFormData
} from '@/types/ai-agents';

// =============================================
// AGENTS CRUD
// =============================================

export function useAIAgents() {
  return useQuery({
    queryKey: ['ai-agents'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ai_agents')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as AIAgent[];
    },
  });
}

export function useAIAgent(id: string | undefined) {
  return useQuery({
    queryKey: ['ai-agent', id],
    queryFn: async () => {
      if (!id) return null;
      
      const { data, error } = await supabase
        .from('ai_agents')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return data as AIAgent;
    },
    enabled: !!id,
  });
}

export function useCreateAIAgent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Partial<AIAgentFormData>) => {
      const { data: agent, error } = await supabase
        .from('ai_agents')
        .insert(data as any)
        .select()
        .single();

      if (error) throw error;
      return agent as AIAgent;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-agents'] });
      toast.success('Agente criado com sucesso!');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao criar agente: ${error.message}`);
    },
  });
}

export function useUpdateAIAgent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<AIAgentFormData> }) => {
      const { data: agent, error } = await supabase
        .from('ai_agents')
        .update({ ...data, updated_at: new Date().toISOString() } as any)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return agent as AIAgent;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['ai-agents'] });
      queryClient.invalidateQueries({ queryKey: ['ai-agent', variables.id] });
      toast.success('Agente atualizado com sucesso!');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao atualizar agente: ${error.message}`);
    },
  });
}

export function useDeleteAIAgent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('ai_agents')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-agents'] });
      toast.success('Agente excluído com sucesso!');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao excluir agente: ${error.message}`);
    },
  });
}

// =============================================
// TOOLS CRUD
// =============================================

export function useAIAgentTools(agentId: string | undefined) {
  return useQuery({
    queryKey: ['ai-agent-tools', agentId],
    queryFn: async () => {
      if (!agentId) return [];
      
      const { data, error } = await supabase
        .from('ai_agent_tools')
        .select('*')
        .eq('agent_id', agentId)
        .order('priority', { ascending: true });

      if (error) throw error;
      return data as AIAgentTool[];
    },
    enabled: !!agentId,
  });
}

export function useCreateAIAgentTool() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: AIAgentToolFormData) => {
      const { data: tool, error } = await supabase
        .from('ai_agent_tools')
        .insert([data] as any)
        .select()
        .single();

      if (error) throw error;
      return tool as AIAgentTool;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['ai-agent-tools', variables.agent_id] });
      toast.success('Ferramenta adicionada!');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao adicionar ferramenta: ${error.message}`);
    },
  });
}

export function useUpdateAIAgentTool() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<AIAgentToolFormData> }) => {
      const { data: tool, error } = await supabase
        .from('ai_agent_tools')
        .update(data as any)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return tool as AIAgentTool;
    },
    onSuccess: (tool) => {
      queryClient.invalidateQueries({ queryKey: ['ai-agent-tools', tool.agent_id] });
      toast.success('Ferramenta atualizada!');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao atualizar ferramenta: ${error.message}`);
    },
  });
}

export function useDeleteAIAgentTool() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, agentId }: { id: string; agentId: string }) => {
      const { error } = await supabase
        .from('ai_agent_tools')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return agentId;
    },
    onSuccess: (agentId) => {
      queryClient.invalidateQueries({ queryKey: ['ai-agent-tools', agentId] });
      toast.success('Ferramenta removida!');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao remover ferramenta: ${error.message}`);
    },
  });
}

// =============================================
// DATA SOURCES CRUD
// =============================================

export function useAIAgentDataSources(agentId: string | undefined) {
  return useQuery({
    queryKey: ['ai-agent-data-sources', agentId],
    queryFn: async () => {
      if (!agentId) return [];
      
      const { data, error } = await supabase
        .from('ai_agent_data_sources')
        .select('*')
        .eq('agent_id', agentId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as AIAgentDataSource[];
    },
    enabled: !!agentId,
  });
}

export function useCreateAIAgentDataSource() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: AIAgentDataSourceFormData) => {
      const { data: source, error } = await supabase
        .from('ai_agent_data_sources')
        .insert([data] as any)
        .select()
        .single();

      if (error) throw error;
      return source as AIAgentDataSource;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['ai-agent-data-sources', variables.agent_id] });
      toast.success('Fonte de dados adicionada!');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao adicionar fonte: ${error.message}`);
    },
  });
}

export function useDeleteAIAgentDataSource() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, agentId }: { id: string; agentId: string }) => {
      const { error } = await supabase
        .from('ai_agent_data_sources')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return agentId;
    },
    onSuccess: (agentId) => {
      queryClient.invalidateQueries({ queryKey: ['ai-agent-data-sources', agentId] });
      toast.success('Fonte de dados removida!');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao remover fonte: ${error.message}`);
    },
  });
}

// =============================================
// CONVERSATIONS & MESSAGES
// =============================================

export function useAIAgentConversations(agentId: string | undefined) {
  return useQuery({
    queryKey: ['ai-agent-conversations', agentId],
    queryFn: async () => {
      if (!agentId) return [];
      
      const { data, error } = await supabase
        .from('ai_agent_conversations')
        .select('*')
        .eq('agent_id', agentId)
        .order('started_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return data;
    },
    enabled: !!agentId,
  });
}

export function useAIAgentMessages(conversationId: string | undefined) {
  return useQuery({
    queryKey: ['ai-agent-messages', conversationId],
    queryFn: async () => {
      if (!conversationId) return [];
      
      const { data, error } = await supabase
        .from('ai_agent_messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data;
    },
    enabled: !!conversationId,
  });
}

// =============================================
// METRICS
// =============================================

export function useAIAgentMetrics(agentId: string | undefined, days: number = 30) {
  return useQuery({
    queryKey: ['ai-agent-metrics', agentId, days],
    queryFn: async () => {
      if (!agentId) return [];
      
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      
      const { data, error } = await supabase
        .from('ai_agent_metrics')
        .select('*')
        .eq('agent_id', agentId)
        .gte('date', startDate.toISOString().split('T')[0])
        .order('date', { ascending: true });

      if (error) throw error;
      return data;
    },
    enabled: !!agentId,
  });
}

// =============================================
// VALIDATE API KEY
// =============================================

export function useValidateAPIKey() {
  return useMutation({
    mutationFn: async ({ provider, apiKey }: { provider: 'openai' | 'google'; apiKey: string }) => {
      // Simple validation by making a minimal API call
      if (provider === 'openai') {
        const response = await fetch('https://api.openai.com/v1/models', {
          headers: { 'Authorization': `Bearer ${apiKey}` },
        });
        if (!response.ok) throw new Error('API Key inválida');
        return true;
      } else if (provider === 'google') {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`
        );
        if (!response.ok) throw new Error('API Key inválida');
        return true;
      }
      return false;
    },
    onSuccess: () => {
      toast.success('API Key válida!');
    },
    onError: (error: Error) => {
      toast.error(`API Key inválida: ${error.message}`);
    },
  });
}
