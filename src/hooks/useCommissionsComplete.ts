import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import type { 
  CommissionRule, 
  SaleCommission, 
  CommissionSplit, 
  SalespersonGoal, 
  CommissionAuditLog,
  SalespersonRanking,
  CommissionTier
} from '@/types/commissions';

// ==================== COMMISSION RULES ====================

export function useCommissionRules() {
  return useQuery({
    queryKey: ['commission-rules'],
    queryFn: async (): Promise<CommissionRule[]> => {
      const { data, error } = await supabase
        .from('commission_rules')
        .select('*')
        .order('priority', { ascending: false });

      if (error) throw error;
      return (data || []).map((rule: any) => ({
        ...rule,
        tiers: rule.tiers as CommissionTier[] | null,
        lead_source_bonus: rule.lead_source_bonus as Record<string, number> | null,
      })) as CommissionRule[];
    },
  });
}

export function useActiveCommissionRules() {
  return useQuery({
    queryKey: ['commission-rules', 'active'],
    queryFn: async (): Promise<CommissionRule[]> => {
      const { data, error } = await supabase
        .from('commission_rules')
        .select('*')
        .eq('is_active', true)
        .order('priority', { ascending: false });

      if (error) throw error;
      return (data || []).map((rule: any) => ({
        ...rule,
        tiers: rule.tiers as CommissionTier[] | null,
        lead_source_bonus: rule.lead_source_bonus as Record<string, number> | null,
      })) as CommissionRule[];
    },
  });
}

interface CreateCommissionRuleInput {
  name: string;
  description?: string;
  commission_type: string;
  percentage_value?: number;
  fixed_value?: number;
  min_vehicle_price?: number;
  max_vehicle_price?: number;
  min_profit_margin?: number;
  min_days_in_stock?: number;
  max_days_in_stock?: number;
  campaign_id?: string;
  lead_source_bonus?: Record<string, number>;
  goal_period?: string;
  goal_target?: number;
  vehicle_categories?: string[];
  tiers?: CommissionTier[];
  is_active?: boolean;
  priority?: number;
}

export function useCreateCommissionRule() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: CreateCommissionRuleInput) => {
      const insertData = {
        ...input,
        created_by: user?.id,
      };
      const { data, error } = await (supabase as any)
        .from('commission_rules')
        .insert(insertData)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['commission-rules'] });
      toast({ title: 'Regra de comissão criada!' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao criar regra', description: error.message, variant: 'destructive' });
    },
  });
}

export function useUpdateCommissionRule() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...input }: { id: string } & Partial<CreateCommissionRuleInput>) => {
      const { data, error } = await (supabase as any)
        .from('commission_rules')
        .update(input)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['commission-rules'] });
      toast({ title: 'Regra atualizada!' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao atualizar', description: error.message, variant: 'destructive' });
    },
  });
}

export function useDeleteCommissionRule() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from('commission_rules')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['commission-rules'] });
      toast({ title: 'Regra excluída!' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao excluir', description: error.message, variant: 'destructive' });
    },
  });
}

// ==================== SALE COMMISSIONS ====================

// Helper para enriquecer comissões com dados de profiles (evita erro PGRST200)
async function enrichCommissionsWithProfiles(commissions: any[]): Promise<SaleCommission[]> {
  if (commissions.length === 0) return [];

  const userIds = Array.from(
    new Set([
      ...commissions.map((c) => c.user_id).filter(Boolean),
      ...commissions.map((c) => c.approved_by).filter(Boolean),
    ])
  );

  if (userIds.length === 0) return commissions as SaleCommission[];

  const { data: profilesData } = await supabase
    .from('profiles')
    .select('id, full_name')
    .in('id', userIds);

  const profileMap = new Map<string, { id: string; full_name: string | null }>();
  (profilesData || []).forEach((p: any) => profileMap.set(p.id, p));

  return commissions.map((c) => ({
    ...c,
    user: c.user_id ? profileMap.get(c.user_id) || null : null,
    approver: c.approved_by ? profileMap.get(c.approved_by) || null : null,
  })) as SaleCommission[];
}

export function useSaleCommissions(filters?: { status?: string; userId?: string }) {
  return useQuery({
    queryKey: ['sale-commissions', filters],
    queryFn: async (): Promise<SaleCommission[]> => {
      let query = supabase
        .from('sale_commissions')
        .select(`
          *,
          commission_rule:commission_rules(id, name, commission_type),
          sale:sales(id, sale_date, sale_price, vehicle:vehicles(brand, model))
        `)
        .order('created_at', { ascending: false });

      if (filters?.status) {
        query = query.eq('status', filters.status);
      }
      if (filters?.userId) {
        query = query.eq('user_id', filters.userId);
      }

      const { data, error } = await query;
      if (error) throw error;
      
      return enrichCommissionsWithProfiles(data || []);
    },
  });
}

export function useCommissionsBySale(saleId: string) {
  return useQuery({
    queryKey: ['sale-commissions', 'sale', saleId],
    queryFn: async (): Promise<SaleCommission[]> => {
      const { data, error } = await supabase
        .from('sale_commissions')
        .select(`
          *,
          commission_rule:commission_rules(id, name, commission_type)
        `)
        .eq('sale_id', saleId);

      if (error) throw error;
      return enrichCommissionsWithProfiles(data || []);
    },
    enabled: !!saleId,
  });
}

interface CreateSaleCommissionInput {
  sale_id: string;
  user_id: string;
  commission_rule_id?: string;
  calculated_amount: number;
  manual_adjustment?: number;
  final_amount: number;
  payment_due_date?: string;
  split_percentage?: number;
  notes?: string;
}

export function useCreateSaleCommission() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateSaleCommissionInput) => {
      const insertData = {
        ...input,
        status: 'pending',
      };
      const { data, error } = await (supabase as any)
        .from('sale_commissions')
        .insert(insertData)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sale-commissions'] });
      queryClient.invalidateQueries({ queryKey: ['sale-profit-reports'] });
      toast({ title: 'Comissão registrada!' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao registrar comissão', description: error.message, variant: 'destructive' });
    },
  });
}

export function useApproveCommission() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ id, notes }: { id: string; notes?: string }) => {
      const updateData = {
        status: 'approved',
        approved_by: user?.id,
        approved_at: new Date().toISOString(),
        notes,
      };
      const { data, error } = await (supabase as any)
        .from('sale_commissions')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sale-commissions'] });
      toast({ title: 'Comissão aprovada!' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao aprovar', description: error.message, variant: 'destructive' });
    },
  });
}

export function useRejectCommission() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ id, rejection_reason }: { id: string; rejection_reason: string }) => {
      const updateData = {
        status: 'rejected',
        approved_by: user?.id,
        approved_at: new Date().toISOString(),
        rejection_reason,
      };
      const { data, error } = await (supabase as any)
        .from('sale_commissions')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sale-commissions'] });
      toast({ title: 'Comissão rejeitada' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao rejeitar', description: error.message, variant: 'destructive' });
    },
  });
}

export function usePayCommission() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const updateData = {
        status: 'paid',
        paid: true,
        paid_at: new Date().toISOString(),
      };
      const { data, error } = await (supabase as any)
        .from('sale_commissions')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sale-commissions'] });
      toast({ title: 'Comissão paga!' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao pagar', description: error.message, variant: 'destructive' });
    },
  });
}

export function useAdjustCommission() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, manual_adjustment, notes }: { id: string; manual_adjustment: number; notes: string }) => {
      // First get current commission
      const { data: current } = await (supabase as any)
        .from('sale_commissions')
        .select('calculated_amount')
        .eq('id', id)
        .single();

      const calculatedAmount = current?.calculated_amount ?? 0;
      const final_amount = calculatedAmount + manual_adjustment;

      const updateData = {
        manual_adjustment,
        final_amount,
        notes,
      };
      const { data, error } = await (supabase as any)
        .from('sale_commissions')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sale-commissions'] });
      toast({ title: 'Ajuste aplicado!' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao ajustar', description: error.message, variant: 'destructive' });
    },
  });
}

// ==================== COMMISSION SPLITS ====================

export function useCommissionSplits(saleId?: string) {
  return useQuery({
    queryKey: ['commission-splits', saleId],
    queryFn: async (): Promise<CommissionSplit[]> => {
      let query = supabase
        .from('commission_splits')
        .select('*');

      if (saleId) {
        query = query.eq('sale_id', saleId);
      }

      const { data, error } = await query;
      if (error) throw error;

      const splits = (data || []) as CommissionSplit[];
      const userIds = Array.from(new Set(splits.map((s) => s.user_id).filter(Boolean)));
      
      if (userIds.length === 0) return splits;

      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', userIds);

      const profileMap = new Map<string, { id: string; full_name: string | null }>();
      (profilesData || []).forEach((p: any) => profileMap.set(p.id, p));

      return splits.map((s) => ({
        ...s,
        user: profileMap.get(s.user_id) || null,
      })) as CommissionSplit[];
    },
    enabled: !saleId || !!saleId,
  });
}

export function useCreateCommissionSplit() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { sale_id: string; user_id: string; percentage: number }) => {
      const { data, error } = await (supabase as any)
        .from('commission_splits')
        .insert(input)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['commission-splits'] });
      toast({ title: 'Divisão criada!' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao criar divisão', description: error.message, variant: 'destructive' });
    },
  });
}

// ==================== SALESPERSON GOALS ====================

// Helper para enriquecer goals com profiles
async function enrichGoalsWithProfiles(goals: any[]): Promise<SalespersonGoal[]> {
  if (goals.length === 0) return [];

  const userIds = Array.from(new Set(goals.map((g) => g.user_id).filter(Boolean)));
  
  if (userIds.length === 0) return goals as SalespersonGoal[];

  const { data: profilesData } = await supabase
    .from('profiles')
    .select('id, full_name')
    .in('id', userIds);

  const profileMap = new Map<string, { id: string; full_name: string | null }>();
  (profilesData || []).forEach((p: any) => profileMap.set(p.id, p));

  return goals.map((g) => ({
    ...g,
    user: g.user_id ? profileMap.get(g.user_id) || null : null,
  })) as SalespersonGoal[];
}

export function useSalespersonGoals(userId?: string) {
  return useQuery({
    queryKey: ['salesperson-goals', userId],
    queryFn: async (): Promise<SalespersonGoal[]> => {
      let query = supabase
        .from('salesperson_goals')
        .select('*')
        .order('period_start', { ascending: false });

      if (userId) {
        query = query.eq('user_id', userId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return enrichGoalsWithProfiles(data || []);
    },
  });
}

export function useCurrentGoals() {
  const today = new Date().toISOString().split('T')[0];
  
  return useQuery({
    queryKey: ['salesperson-goals', 'current'],
    queryFn: async (): Promise<SalespersonGoal[]> => {
      const { data, error } = await supabase
        .from('salesperson_goals')
        .select('*')
        .lte('period_start', today)
        .gte('period_end', today);

      if (error) throw error;
      return enrichGoalsWithProfiles(data || []);
    },
  });
}

interface CreateGoalInput {
  user_id: string;
  period_start: string;
  period_end: string;
  target_sales: number;
  target_revenue: number;
  target_profit: number;
}

export function useCreateSalespersonGoal() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateGoalInput) => {
      const { data, error } = await (supabase as any)
        .from('salesperson_goals')
        .insert(input)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['salesperson-goals'] });
      toast({ title: 'Meta criada!' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao criar meta', description: error.message, variant: 'destructive' });
    },
  });
}

export function useUpdateSalespersonGoal() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...input }: { id: string } & Partial<CreateGoalInput>) => {
      const { data, error } = await (supabase as any)
        .from('salesperson_goals')
        .update(input)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['salesperson-goals'] });
      toast({ title: 'Meta atualizada!' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao atualizar', description: error.message, variant: 'destructive' });
    },
  });
}

// ==================== COMMISSION AUDIT LOG ====================

export function useCommissionAuditLog(commissionId?: string) {
  return useQuery({
    queryKey: ['commission-audit-log', commissionId],
    queryFn: async (): Promise<CommissionAuditLog[]> => {
      let query = supabase
        .from('commission_audit_log')
        .select(`
          *,
          changer:profiles!changed_by(id, full_name)
        `)
        .order('changed_at', { ascending: false });

      if (commissionId) {
        query = query.eq('commission_id', commissionId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as unknown as CommissionAuditLog[];
    },
  });
}

// ==================== SALESPERSON RANKING ====================

export function useSalespersonRanking() {
  return useQuery({
    queryKey: ['salesperson-ranking'],
    queryFn: async (): Promise<SalespersonRanking[]> => {
      const { data, error } = await supabase
        .from('salesperson_ranking')
        .select('*');

      if (error) throw error;
      return (data || []) as SalespersonRanking[];
    },
  });
}

// ==================== COMMISSION STATS ====================

export function useCommissionStats() {
  return useQuery({
    queryKey: ['commission-stats'],
    queryFn: async () => {
      const { data: commissions, error } = await supabase
        .from('sale_commissions')
        .select('*');

      if (error) throw error;

      const stats = {
        totalPending: 0,
        totalApproved: 0,
        totalPaid: 0,
        totalRejected: 0,
        countPending: 0,
        countApproved: 0,
        countPaid: 0,
        countRejected: 0,
      };

      (commissions || []).forEach((c: any) => {
        switch (c.status) {
          case 'pending':
            stats.totalPending += c.final_amount || 0;
            stats.countPending++;
            break;
          case 'approved':
            stats.totalApproved += c.final_amount || 0;
            stats.countApproved++;
            break;
          case 'paid':
            stats.totalPaid += c.final_amount || 0;
            stats.countPaid++;
            break;
          case 'rejected':
            stats.totalRejected += c.final_amount || 0;
            stats.countRejected++;
            break;
        }
      });

      return stats;
    },
  });
}

// ==================== COMMISSION PROJECTIONS ====================

export function useCommissionProjections() {
  return useQuery({
    queryKey: ['commission-projections'],
    queryFn: async () => {
      // Get active negotiations to project potential commissions
      const { data: negotiations, error: negError } = await supabase
        .from('negotiations')
        .select('estimated_value, probability, salesperson_id')
        .in('status', ['atendimento_ia', 'negociando']);

      if (negError) throw negError;

      // Get active commission rules
      const { data: rules, error: rulesError } = await supabase
        .from('commission_rules')
        .select('*')
        .eq('is_active', true)
        .order('priority', { ascending: false });

      if (rulesError) throw rulesError;

      // Calculate projections
      let projectedTotal = 0;
      let weightedTotal = 0;

      (negotiations || []).forEach((neg: any) => {
        const estimatedProfit = (neg.estimated_value || 0) * 0.15; // Assume 15% margin
        const probability = (neg.probability || 50) / 100;
        
        // Find applicable rule
        const rule = (rules || [])[0];
        if (rule) {
          let commission = 0;
          if (rule.commission_type === 'percentual_lucro' && rule.percentage_value) {
            commission = estimatedProfit * (rule.percentage_value / 100);
          } else if (rule.commission_type === 'valor_fixo' && rule.fixed_value) {
            commission = rule.fixed_value;
          }
          
          projectedTotal += commission;
          weightedTotal += commission * probability;
        }
      });

      return {
        projectedTotal,
        weightedTotal,
        negotiationsCount: negotiations?.length || 0,
      };
    },
  });
}

// ==================== AUTO CALCULATE COMMISSION ====================

export function useCalculateCommission() {
  const { data: rules } = useActiveCommissionRules();

  const calculateCommission = (salePrice: number, profit: number, daysInStock: number, leadSource?: string) => {
    if (!rules || rules.length === 0) return null;

    // Find the best matching rule
    for (const rule of rules) {
      // Check price range
      if (rule.min_vehicle_price && salePrice < rule.min_vehicle_price) continue;
      if (rule.max_vehicle_price && salePrice > rule.max_vehicle_price) continue;
      
      // Check profit margin
      const margin = (profit / salePrice) * 100;
      if (rule.min_profit_margin && margin < rule.min_profit_margin) continue;
      
      // Check days in stock
      if (rule.min_days_in_stock && daysInStock < rule.min_days_in_stock) continue;
      if (rule.max_days_in_stock && daysInStock > rule.max_days_in_stock) continue;

      // Calculate commission based on type
      let amount = 0;

      switch (rule.commission_type) {
        case 'percentual_lucro':
          amount = profit * ((rule.percentage_value || 0) / 100);
          break;
        case 'valor_fixo':
          amount = rule.fixed_value || 0;
          break;
        case 'escalonada':
          // Would need sales count for tiered calculation
          if (rule.tiers && rule.tiers.length > 0) {
            amount = profit * ((rule.tiers[0].percentage || 0) / 100);
          }
          break;
        case 'mista':
          amount = (profit * ((rule.percentage_value || 0) / 100)) + (rule.fixed_value || 0);
          break;
        default:
          // Handle percentual_venda or other future types
          if ((rule as any).commission_type === 'percentual_venda') {
            amount = salePrice * ((rule.percentage_value || 0) / 100);
          }
          break;
      }

      // Apply lead source bonus if applicable
      if (leadSource && rule.lead_source_bonus && rule.lead_source_bonus[leadSource]) {
        amount += rule.lead_source_bonus[leadSource];
      }

      return {
        rule,
        amount,
      };
    }

    return null;
  };

  return { calculateCommission, rules };
}
