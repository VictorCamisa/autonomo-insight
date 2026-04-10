import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Lead, LeadStatus, LeadSource, QualificationStatus } from '@/types/crm';
import { toast } from 'sonner';

// Clear all conversation history for a lead (for testing purposes)
export function useClearLeadHistory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (leadId: string) => {
      // 1. Get all AI conversations for this lead
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: conversations } = await (supabase as any)
        .from('ai_agent_conversations')
        .select('id')
        .eq('lead_id', leadId);

      const conversationIds = (conversations || []).map((c: any) => c.id);

      // 2. Delete AI messages for these conversations
      if (conversationIds.length > 0) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase as any)
          .from('ai_agent_messages')
          .delete()
          .in('conversation_id', conversationIds);

        // 3. Delete conversation embeddings
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase as any)
          .from('conversation_embeddings')
          .delete()
          .in('conversation_id', conversationIds);
      }

      // 4. Delete lead-level embeddings
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any)
        .from('conversation_embeddings')
        .delete()
        .eq('lead_id', leadId);

      // 5. Delete AI conversations
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any)
        .from('ai_agent_conversations')
        .delete()
        .eq('lead_id', leadId);

      // 6. Delete lead qualification data
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any)
        .from('lead_qualification_data')
        .delete()
        .eq('lead_id', leadId);

      // 7. Delete WhatsApp messages for this lead's contacts
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: contacts } = await (supabase as any)
        .from('whatsapp_contacts')
        .select('id')
        .eq('lead_id', leadId);

      const contactIds = (contacts || []).map((c: any) => c.id);
      if (contactIds.length > 0) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase as any)
          .from('whatsapp_messages')
          .delete()
          .in('contact_id', contactIds);
      }

      // 8. Reset lead qualification status
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any)
        .from('leads')
        .update({
          qualification_status: 'nao_qualificado',
          qualification_reason: null,
          vehicle_interest: null,
        })
        .eq('id', leadId);

      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['lead-qualification'] });
      queryClient.invalidateQueries({ queryKey: ['lead-ai-conversation'] });
      queryClient.invalidateQueries({ queryKey: ['ai-conversation-messages'] });
      queryClient.invalidateQueries({ queryKey: ['whatsapp-messages'] });
      toast.success('Histórico de conversa limpo com sucesso!');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao limpar histórico: ${error.message}`);
    },
  });
}

// Delete lead and all related data completely
export function useDeleteLeadComplete() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (leadId: string) => {
      // 1. Get all AI conversations for this lead
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: conversations } = await (supabase as any)
        .from('ai_agent_conversations')
        .select('id')
        .eq('lead_id', leadId);

      const conversationIds = (conversations || []).map((c: any) => c.id);

      // 2. Delete AI messages
      if (conversationIds.length > 0) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase as any)
          .from('ai_agent_messages')
          .delete()
          .in('conversation_id', conversationIds);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase as any)
          .from('conversation_embeddings')
          .delete()
          .in('conversation_id', conversationIds);
      }

      // 3. Delete lead embeddings
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any)
        .from('conversation_embeddings')
        .delete()
        .eq('lead_id', leadId);

      // 4. Delete AI conversations
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any)
        .from('ai_agent_conversations')
        .delete()
        .eq('lead_id', leadId);

      // 5. Delete lead qualification data
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any)
        .from('lead_qualification_data')
        .delete()
        .eq('lead_id', leadId);

      // 6. Delete WhatsApp messages and contacts
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: contacts } = await (supabase as any)
        .from('whatsapp_contacts')
        .select('id')
        .eq('lead_id', leadId);

      const contactIds = (contacts || []).map((c: any) => c.id);
      if (contactIds.length > 0) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase as any)
          .from('whatsapp_messages')
          .delete()
          .in('contact_id', contactIds);
      }

      // 7. Delete WhatsApp contacts
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any)
        .from('whatsapp_contacts')
        .delete()
        .eq('lead_id', leadId);


      // 9. Delete negotiations
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any)
        .from('negotiations')
        .delete()
        .eq('lead_id', leadId);

      // 10. Delete lead assignments
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any)
        .from('lead_assignments')
        .delete()
        .eq('lead_id', leadId);

      // 11. Finally delete the lead itself
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from('leads')
        .delete()
        .eq('id', leadId);

      if (error) throw error;
      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['negotiations'] });
      queryClient.invalidateQueries({ queryKey: ['whatsapp-contacts'] });
      toast.success('Lead e todo histórico excluídos com sucesso!');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao excluir lead: ${error.message}`);
    },
  });
}

// Shared query options for better caching
const leadQueryOptions = {
  staleTime: 1000 * 60 * 3, // 3 minutes
  gcTime: 1000 * 60 * 10, // 10 minutes
  refetchOnWindowFocus: false,
  refetchOnMount: false,
};

export function useLeads() {
  return useQuery({
    queryKey: ['leads'],
    queryFn: async (): Promise<Lead[]> => {
      // 1) Buscar leads sem join (evita erro do PostgREST por falta de FK leads.assigned_to -> profiles.id)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('leads')
        .select(`
          *,
          meta_campaign:meta_campaigns(id, name)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const leads = (data || []) as Lead[];

      // 2) Enriquecer com assigned_profile via uma segunda query (mantém o campo usado no UI)
      const assignedIds = Array.from(
        new Set(leads.map((l) => l.assigned_to).filter(Boolean) as string[])
      );

      if (!assignedIds.length) return leads;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: profiles, error: profilesError } = await (supabase as any)
        .from('profiles')
        .select('id, full_name')
        .in('id', assignedIds);

      if (profilesError) {
        // Não quebra a tela por falha de join; apenas retorna os leads sem o nome do responsável
        console.warn('[useLeads] Falha ao buscar profiles:', profilesError);
        return leads;
      }

      const profileMap = new Map<string, { full_name: string | null }>(
        (profiles || []).map((p: any) => [p.id as string, { full_name: p.full_name ?? null }])
      );

      return leads.map((l) => ({
        ...l,
        assigned_profile: l.assigned_to ? profileMap.get(l.assigned_to) : undefined,
      }));
    },
    ...leadQueryOptions,
  });
}

export function useLead(id: string) {
  return useQuery({
    queryKey: ['leads', id],
    queryFn: async (): Promise<Lead | null> => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('leads')
        .select(`
          *,
          meta_campaign:meta_campaigns(id, name)
        `)
        .eq('id', id)
        .maybeSingle();

      if (error) throw error;
      if (!data) return null;

      const lead = data as Lead;

      if (!lead.assigned_to) return lead;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: profile, error: profileError } = await (supabase as any)
        .from('profiles')
        .select('id, full_name')
        .eq('id', lead.assigned_to)
        .maybeSingle();

      if (profileError) {
        console.warn('[useLead] Falha ao buscar profile do responsável:', profileError);
        return lead;
      }

      return {
        ...lead,
        assigned_profile: profile ? { full_name: (profile as any).full_name ?? null } : undefined,
      };
    },
    enabled: !!id,
    ...leadQueryOptions,
  });
}

interface CreateLeadInput {
  name: string;
  email?: string;
  phone: string;
  source: LeadSource;
  status?: LeadStatus;
  notes?: string;
  vehicle_interest?: string;
  assigned_to?: string;
  meta_campaign_id?: string;
  qualification_status?: QualificationStatus;
  qualification_reason?: string;
}

// Check for duplicate leads/customers before creating
async function checkDuplicates(phone: string, email?: string) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: existingLeads } = await (supabase as any)
    .from('leads')
    .select('id, name, phone, status')
    .eq('phone', phone);

  if (existingLeads && existingLeads.length > 0) {
    return { type: 'lead' as const, existing: existingLeads[0] };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: existingCustomers } = await (supabase as any)
    .from('customers')
    .select('id, name, phone')
    .eq('phone', phone);

  if (existingCustomers && existingCustomers.length > 0) {
    return { type: 'customer' as const, existing: existingCustomers[0] };
  }

  if (email) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: leadsByEmail } = await (supabase as any)
      .from('leads')
      .select('id, name, email, phone')
      .eq('email', email);

    if (leadsByEmail && leadsByEmail.length > 0) {
      return { type: 'lead' as const, existing: leadsByEmail[0] };
    }
  }

  return null;
}

export function useCreateLead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateLeadInput) => {
      const duplicate = await checkDuplicates(input.phone, input.email);
      
      if (duplicate) {
        throw new Error(`${duplicate.type === 'lead' ? 'Lead' : 'Cliente'} já existe: ${duplicate.existing.name} (${duplicate.existing.phone})`);
      }

      const { data: { user } } = await supabase.auth.getUser();
      
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('leads')
        .insert({
          name: input.name,
          phone: input.phone,
          email: input.email || null,
          source: input.source,
          status: input.status || 'novo',
          notes: input.notes || null,
          vehicle_interest: input.vehicle_interest || null,
          created_by: user?.id || null,
          assigned_to: input.assigned_to || user?.id || null,
          meta_campaign_id: input.meta_campaign_id || null,
          qualification_status: input.qualification_status || 'nao_qualificado',
          qualification_reason: input.qualification_reason || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      toast.success('Lead criado com sucesso!');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

interface UpdateLeadInput {
  id: string;
  name?: string;
  email?: string;
  phone?: string;
  source?: LeadSource;
  status?: LeadStatus;
  notes?: string;
  vehicle_interest?: string;
  assigned_to?: string;
  meta_campaign_id?: string | null;
  qualification_status?: QualificationStatus;
  qualification_reason?: string;
}

export function useUpdateLead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...input }: UpdateLeadInput) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('leads')
        .update(input)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      toast.success('Lead atualizado com sucesso!');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao atualizar lead: ${error.message}`);
    },
  });
}

export function useDeleteLead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from('leads')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      toast.success('Lead excluído com sucesso!');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao excluir lead: ${error.message}`);
    },
  });
}
