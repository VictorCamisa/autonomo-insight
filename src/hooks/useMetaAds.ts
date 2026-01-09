import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { MetaCampaign, MetaAdSet, MetaAd, MetaInsight, MetaSyncLog, MetaKPIs } from '@/types/meta-ads';

// Sync Meta Ads data
export function useMetaAdsSync() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/meta-ads-sync`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erro ao sincronizar');
      }

      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['meta-campaigns'] });
      queryClient.invalidateQueries({ queryKey: ['meta-adsets'] });
      queryClient.invalidateQueries({ queryKey: ['meta-ads'] });
      queryClient.invalidateQueries({ queryKey: ['meta-insights'] });
      queryClient.invalidateQueries({ queryKey: ['meta-sync-logs'] });
      
      toast({
        title: 'Sincronização concluída!',
        description: `${data.data.campaigns_synced} campanhas, ${data.data.insights_synced} métricas sincronizadas.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro na sincronização',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

// Fetch campaigns
export function useMetaCampaigns() {
  return useQuery({
    queryKey: ['meta-campaigns'],
    queryFn: async (): Promise<MetaCampaign[]> => {
      const { data, error } = await (supabase as any)
        .from('meta_campaigns')
        .select('*')
        .order('updated_at', { ascending: false });

      if (error) throw error;
      return (data || []) as MetaCampaign[];
    },
  });
}

// Fetch ad sets
export function useMetaAdSets(campaignId?: string) {
  return useQuery({
    queryKey: ['meta-adsets', campaignId],
    queryFn: async (): Promise<MetaAdSet[]> => {
      let query = (supabase as any)
        .from('meta_adsets')
        .select('*')
        .order('updated_at', { ascending: false });

      if (campaignId) {
        query = query.eq('campaign_id', campaignId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as MetaAdSet[];
    },
  });
}

// Fetch ads
export function useMetaAds(adsetId?: string) {
  return useQuery({
    queryKey: ['meta-ads', adsetId],
    queryFn: async (): Promise<MetaAd[]> => {
      let query = (supabase as any)
        .from('meta_ads')
        .select('*')
        .order('updated_at', { ascending: false });

      if (adsetId) {
        query = query.eq('adset_id', adsetId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as MetaAd[];
    },
  });
}

// Fetch insights
export function useMetaInsights(entityType?: string, entityId?: string, dateRange?: { from: string; to: string }) {
  return useQuery({
    queryKey: ['meta-insights', entityType, entityId, dateRange],
    queryFn: async (): Promise<MetaInsight[]> => {
      let query = (supabase as any)
        .from('meta_insights')
        .select('*')
        .order('date_start', { ascending: false });

      if (entityType) {
        query = query.eq('entity_type', entityType);
      }

      if (entityId) {
        query = query.eq('entity_id', entityId);
      }

      if (dateRange) {
        query = query.gte('date_start', dateRange.from).lte('date_start', dateRange.to);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as MetaInsight[];
    },
  });
}

// Calculate KPIs from insights
export function useMetaKPIs(dateRange?: { from: string; to: string }) {
  const { data: insights, isLoading } = useMetaInsights('account', undefined, dateRange);

  const kpis: MetaKPIs = {
    totalSpend: 0,
    totalImpressions: 0,
    totalClicks: 0,
    totalReach: 0,
    avgCTR: 0,
    avgCPC: 0,
    avgCPM: 0,
    avgFrequency: 0,
    totalConversions: 0,
  };

  if (insights && insights.length > 0) {
    kpis.totalSpend = insights.reduce((sum, i) => sum + (i.spend || 0), 0);
    kpis.totalImpressions = insights.reduce((sum, i) => sum + (i.impressions || 0), 0);
    kpis.totalClicks = insights.reduce((sum, i) => sum + (i.clicks || 0), 0);
    kpis.totalReach = insights.reduce((sum, i) => sum + (i.reach || 0), 0);
    kpis.totalConversions = insights.reduce((sum, i) => sum + (i.conversions || 0), 0);

    // Calculate averages
    if (kpis.totalImpressions > 0) {
      kpis.avgCTR = (kpis.totalClicks / kpis.totalImpressions) * 100;
      kpis.avgCPM = (kpis.totalSpend / kpis.totalImpressions) * 1000;
    }
    if (kpis.totalClicks > 0) {
      kpis.avgCPC = kpis.totalSpend / kpis.totalClicks;
    }
    if (kpis.totalReach > 0) {
      kpis.avgFrequency = kpis.totalImpressions / kpis.totalReach;
    }
  }

  return { kpis, isLoading };
}

// Fetch sync logs
export function useMetaSyncLogs() {
  return useQuery({
    queryKey: ['meta-sync-logs'],
    queryFn: async (): Promise<MetaSyncLog[]> => {
      const { data, error } = await (supabase as any)
        .from('meta_sync_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      return (data || []) as MetaSyncLog[];
    },
  });
}

// Get daily insights for charts
export function useMetaDailyInsights(days: number = 30) {
  return useQuery({
    queryKey: ['meta-daily-insights', days],
    queryFn: async (): Promise<MetaInsight[]> => {
      const fromDate = new Date();
      fromDate.setDate(fromDate.getDate() - days);
      
      const { data, error } = await (supabase as any)
        .from('meta_insights')
        .select('*')
        .eq('entity_type', 'account')
        .gte('date_start', fromDate.toISOString().split('T')[0])
        .order('date_start', { ascending: true });

      if (error) throw error;
      return (data || []) as MetaInsight[];
    },
  });
}

// Get campaign insights for comparison
export function useMetaCampaignInsights() {
  return useQuery({
    queryKey: ['meta-campaign-insights'],
    queryFn: async (): Promise<MetaInsight[]> => {
      const { data, error } = await (supabase as any)
        .from('meta_insights')
        .select('*')
        .eq('entity_type', 'campaign')
        .order('spend', { ascending: false });

      if (error) throw error;
      return (data || []) as MetaInsight[];
    },
  });
}
