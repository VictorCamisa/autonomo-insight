import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ProcessResult {
  success: boolean;
  processed: number;
  sent: number;
  skipped: number;
  errors: number;
  errorDetails?: string[];
  durationMs: number;
}

export function useProcessFollowUps() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (): Promise<ProcessResult> => {
      const { data, error } = await supabase.functions.invoke('process-follow-ups', {
        method: 'POST',
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      if (data.sent > 0) {
        toast.success(`Follow-ups processados!`, {
          description: `${data.sent} mensagens enviadas, ${data.skipped} ignoradas`,
        });
      } else if (data.processed > 0) {
        toast.info('Nenhum follow-up pendente', {
          description: `${data.processed} leads verificados, nenhum precisava de follow-up agora`,
        });
      } else {
        toast.info('Nenhum lead para processar');
      }

      // Invalidar queries relacionadas
      queryClient.invalidateQueries({ queryKey: ['follow-up-flows'] });
      queryClient.invalidateQueries({ queryKey: ['leads'] });
    },
    onError: (error) => {
      console.error('Error processing follow-ups:', error);
      toast.error('Erro ao processar follow-ups', {
        description: error instanceof Error ? error.message : 'Erro desconhecido',
      });
    },
  });
}

// Hook para buscar histórico de execuções
export function useFollowUpExecutions(flowId?: string) {
  return useMutation({
    mutationFn: async () => {
      let query = supabase
        .from('follow_up_step_executions')
        .select(`
          *,
          lead:leads(id, name, phone),
          flow:follow_up_flows(id, name),
          step:follow_up_steps(id, step_order, message_template)
        `)
        .order('executed_at', { ascending: false })
        .limit(100);

      if (flowId) {
        query = query.eq('flow_id', flowId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
}
