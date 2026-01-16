import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface FollowUpSettings {
  id: string;
  automation_enabled: boolean;
  interval_minutes: number;
  last_execution_at: string | null;
  updated_at: string;
  updated_by: string | null;
}

export function useFollowUpSettings() {
  const queryClient = useQueryClient();

  const { data: settings, isLoading } = useQuery({
    queryKey: ['follow-up-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('follow_up_settings')
        .select('*')
        .single();
      
      if (error) throw error;
      return data as FollowUpSettings;
    },
  });

  const updateSettingsMutation = useMutation({
    mutationFn: async (updates: Partial<Pick<FollowUpSettings, 'automation_enabled' | 'interval_minutes'>>) => {
      const { data, error } = await supabase
        .from('follow_up_settings')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', settings?.id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['follow-up-settings'] });
      if (data.automation_enabled) {
        toast.success(`Automação ativada! Execução a cada ${data.interval_minutes} minutos.`);
      } else {
        toast.info('Automação desativada. Use o botão "Executar Agora" para disparar manualmente.');
      }
    },
    onError: (error) => {
      console.error('Error updating settings:', error);
      toast.error('Erro ao atualizar configurações');
    },
  });

  const toggleAutomation = () => {
    if (settings) {
      updateSettingsMutation.mutate({ automation_enabled: !settings.automation_enabled });
    }
  };

  const updateInterval = (interval_minutes: number) => {
    if (settings) {
      updateSettingsMutation.mutate({ interval_minutes });
    }
  };

  return {
    settings,
    isLoading,
    toggleAutomation,
    updateInterval,
    isUpdating: updateSettingsMutation.isPending,
  };
}
