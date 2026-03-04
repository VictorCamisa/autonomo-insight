import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface PortalSetting {
  id: string;
  portal_key: string;
  is_enabled: boolean;
}

export function usePortalSettings() {
  return useQuery({
    queryKey: ['portal-settings'],
    queryFn: async (): Promise<PortalSetting[]> => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('portal_settings')
        .select('*');
      if (error) throw error;
      return data || [];
    },
    staleTime: 1000 * 60 * 10,
  });
}

export function useTogglePortalSetting() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ portalKey, isEnabled }: { portalKey: string; isEnabled: boolean }) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from('portal_settings')
        .update({ is_enabled: isEnabled, updated_at: new Date().toISOString() })
        .eq('portal_key', portalKey);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portal-settings'] });
    },
  });
}

export function useToggleVehiclePortal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ vehicleId, field, value }: { vehicleId: string; field: 'portal_ml' | 'portal_np'; value: boolean }) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from('vehicles')
        .update({ [field]: value })
        .eq('id', vehicleId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
    },
  });
}
