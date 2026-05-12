import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useSiteSetting(key: string) {
  return useQuery({
    queryKey: ['site_setting', key],
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('site_settings')
        .select('value')
        .eq('key', key)
        .maybeSingle();
      if (error) throw error;
      return (data?.value as string | null) ?? null;
    },
    staleTime: 1000 * 60 * 5,
  });
}

export function useUpsertSiteSetting() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ key, value }: { key: string; value: string | null }) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from('site_settings')
        .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: 'key' });
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['site_setting', vars.key] });
    },
  });
}

export function useDeleteSiteSetting() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (key: string) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from('site_settings')
        .delete()
        .eq('key', key);
      if (error) throw error;
    },
    onSuccess: (_d, key) => {
      qc.invalidateQueries({ queryKey: ['site_setting', key] });
    },
  });
}
