import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// Types
export interface QualificationLevel {
  id: string;
  level: string;
  name: string;
  description: string | null;
  required_fields: string[];
  optional_fields: string[];
  points_config: Record<string, number>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface LeadQualificationData {
  nome?: string;
  telefone?: string;
  veiculo_interesse?: string;
  origem?: string;
  forma_pagamento?: string;
  orcamento?: number;
  entrada?: number;
  parcela?: number;
  veiculo_troca?: string;
  tem_troca?: boolean;
  cpf?: string;
  nome_limpo?: boolean;
  profissao?: string;
  renda?: number;
}

// Field labels for display
export const FIELD_LABELS: Record<string, string> = {
  nome: 'Nome',
  telefone: 'Telefone',
  veiculo_interesse: 'Veículo de Interesse',
  origem: 'Origem (como encontrou)',
  forma_pagamento: 'Forma de Pagamento',
  orcamento: 'Orçamento',
  entrada: 'Valor da Entrada',
  parcela: 'Parcela Desejada',
  veiculo_troca: 'Veículo na Troca',
  tem_troca: 'Tem Troca',
  cpf: 'CPF',
  nome_limpo: 'Nome Limpo (SPC/Serasa)',
  profissao: 'Profissão',
  renda: 'Renda',
};

// Field icons for display
export const FIELD_ICONS: Record<string, string> = {
  nome: 'User',
  telefone: 'Phone',
  veiculo_interesse: 'Car',
  origem: 'MapPin',
  forma_pagamento: 'CreditCard',
  orcamento: 'DollarSign',
  entrada: 'Wallet',
  parcela: 'Calendar',
  veiculo_troca: 'RefreshCw',
  tem_troca: 'ArrowRightLeft',
  cpf: 'FileText',
  nome_limpo: 'CheckCircle',
  profissao: 'Briefcase',
  renda: 'TrendingUp',
};

// =============================================
// HOOKS
// =============================================

// Fetch all qualification levels (Q1, Q2, Q3)
export function useQualificationLevels() {
  return useQuery({
    queryKey: ['qualification-levels'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('qualification_settings')
        .select('*')
        .in('level', ['Q1', 'Q2', 'Q3'])
        .order('level', { ascending: true });

      if (error) throw error;
      return (data || []) as QualificationLevel[];
    },
  });
}

// Fetch current active qualification level
export function useCurrentQualificationLevel() {
  return useQuery({
    queryKey: ['current-qualification-level'],
    queryFn: async () => {
      // Get the CURRENT setting which stores the active level
      const { data, error } = await (supabase as any)
        .from('qualification_settings')
        .select('*')
        .eq('level', 'CURRENT')
        .single();

      if (error) throw error;
      
      // required_fields[0] contains the current level (Q1, Q2, or Q3)
      const currentLevel = data?.required_fields?.[0] || 'Q2';
      return currentLevel as string;
    },
  });
}

// Set the current active qualification level
export function useSetCurrentQualificationLevel() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (level: string) => {
      const { error } = await (supabase as any)
        .from('qualification_settings')
        .update({ 
          required_fields: [level],
          updated_at: new Date().toISOString() 
        })
        .eq('level', 'CURRENT');

      if (error) throw error;
      return level;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['current-qualification-level'] });
      toast.success('Nível de qualificação atualizado!');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao atualizar: ${error.message}`);
    },
  });
}

// Fetch qualification settings for a specific level
export function useQualificationLevel(level: string) {
  return useQuery({
    queryKey: ['qualification-level', level],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('qualification_settings')
        .select('*')
        .eq('level', level)
        .single();

      if (error) throw error;
      return data as QualificationLevel;
    },
    enabled: !!level,
  });
}

// Update lead qualification data
export function useUpdateLeadQualification() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      leadId, 
      qualificationData, 
      score, 
      status 
    }: { 
      leadId: string; 
      qualificationData: LeadQualificationData;
      score?: number;
      status?: 'pending' | 'partial' | 'complete';
    }) => {
      const { error } = await (supabase as any)
        .from('leads')
        .update({ 
          qualification_data: qualificationData,
          qualification_score: score,
          qualification_status: status,
          updated_at: new Date().toISOString() 
        })
        .eq('id', leadId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
    },
  });
}

// Calculate score based on collected data and level config
export function calculateQualificationScore(
  data: LeadQualificationData,
  level: QualificationLevel
): { score: number; status: 'pending' | 'partial' | 'complete'; collected: string[]; missing: string[] } {
  const pointsConfig = level.points_config;
  const requiredFields = level.required_fields;
  const optionalFields = level.optional_fields;
  
  let score = 0;
  const collected: string[] = [];
  const missing: string[] = [];
  
  // Check required fields
  for (const field of requiredFields) {
    const value = data[field as keyof LeadQualificationData];
    if (value !== undefined && value !== null && value !== '') {
      score += pointsConfig[field] || 0;
      collected.push(field);
    } else {
      missing.push(field);
    }
  }
  
  // Check optional fields (bonus points)
  for (const field of optionalFields) {
    const value = data[field as keyof LeadQualificationData];
    if (value !== undefined && value !== null && value !== '') {
      score += pointsConfig[field] || 0;
      collected.push(field);
    }
  }
  
  // Determine status
  let status: 'pending' | 'partial' | 'complete' = 'pending';
  if (collected.length === 0) {
    status = 'pending';
  } else if (missing.length === 0) {
    status = 'complete';
  } else {
    status = 'partial';
  }
  
  return { score: Math.min(score, 100), status, collected, missing };
}
