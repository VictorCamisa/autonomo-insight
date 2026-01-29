import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { 
  WhatsAppInstance, 
  WhatsAppContact, 
  WhatsAppMessage, 
  WhatsAppTemplate 
} from '@/types/whatsapp';
import { toast } from 'sonner';

// ============ USER WHATSAPP INSTANCE ============

export function useUserWhatsAppInstance(userId: string) {
  return useQuery({
    queryKey: ['whatsapp-instance-user', userId],
    queryFn: async (): Promise<WhatsAppInstance | null> => {
      // First get instance from DB
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('whatsapp_instances')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) throw error;
      return data as WhatsAppInstance | null;
    },
    enabled: !!userId,
    refetchInterval: (query) => {
      // Poll every 3 seconds if status is qr_code
      const instance = query.state.data;
      if (instance?.status === 'qr_code') {
        return 3000;
      }
      return false;
    },
  });
}

// Sync status from Evolution API
export function useSyncUserWhatsAppStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (userId: string) => {
      const { data, error } = await supabase.functions.invoke('whatsapp-instance', {
        body: { action: 'checkUserStatus', userId },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data, userId) => {
      if (data?.status) {
        queryClient.invalidateQueries({ queryKey: ['whatsapp-instance-user', userId] });
      }
    },
  });
}

export function useActivateUserWhatsApp() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (userId: string) => {
      const { data, error } = await supabase.functions.invoke('whatsapp-instance', {
        body: { action: 'createForUser', userId },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (_, userId) => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-instance-user', userId] });
      queryClient.invalidateQueries({ queryKey: ['whatsapp-instances'] });
      toast.success('Instância WhatsApp criada! Escaneie o QR Code.');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao ativar WhatsApp: ${error.message}`);
    },
  });
}

export function useRefreshQRCode() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (instanceId: string) => {
      const { data, error } = await supabase.functions.invoke('whatsapp-instance', {
        body: { action: 'refreshQR', instanceId },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-instance-user'] });
      queryClient.invalidateQueries({ queryKey: ['whatsapp-instances'] });
    },
    onError: (error: Error) => {
      toast.error(`Erro ao atualizar QR Code: ${error.message}`);
    },
  });
}

export function useDisconnectUserWhatsApp() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (instanceId: string) => {
      const { data, error } = await supabase.functions.invoke('whatsapp-instance', {
        body: { action: 'logout', instanceId },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-instance-user'] });
      queryClient.invalidateQueries({ queryKey: ['whatsapp-instances'] });
      toast.success('WhatsApp desconectado!');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao desconectar: ${error.message}`);
    },
  });
}

// ============ INSTANCES ============

export function useWhatsAppInstances() {
  return useQuery({
    queryKey: ['whatsapp-instances'],
    queryFn: async (): Promise<WhatsAppInstance[]> => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('whatsapp_instances')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      return (data || []) as WhatsAppInstance[];
    },
    refetchInterval: 10000, // Auto-refresh every 10 seconds
  });
}

export function useSharedWhatsAppInstance() {
  return useQuery({
    queryKey: ['whatsapp-instance-shared'],
    queryFn: async (): Promise<WhatsAppInstance | null> => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      // First try to find a shared instance that is connected
      const { data: sharedInstance, error: sharedError } = await (supabase as any)
        .from('whatsapp_instances')
        .select('*')
        .eq('is_shared', true)
        .eq('status', 'connected')
        .limit(1)
        .maybeSingle();

      if (sharedError) throw sharedError;
      if (sharedInstance) return sharedInstance as WhatsAppInstance;

      // Fallback: get any connected instance (prefer default, then any)
      const { data: anyInstance, error: anyError } = await (supabase as any)
        .from('whatsapp_instances')
        .select('*')
        .eq('status', 'connected')
        .order('is_default', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (anyError) throw anyError;
      return anyInstance as WhatsAppInstance | null;
    },
  });
}

export function useWhatsAppInstance(id: string) {
  return useQuery({
    queryKey: ['whatsapp-instance', id],
    queryFn: async (): Promise<WhatsAppInstance | null> => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('whatsapp_instances')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return data as WhatsAppInstance;
    },
    enabled: !!id,
  });
}

interface CreateInstanceInput {
  name: string;
  instance_name: string;
  api_url: string;
  api_key: string;
  is_default?: boolean;
}

export function useCreateWhatsAppInstance() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateInstanceInput) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('whatsapp_instances')
        .insert({
          ...input,
          created_by: user?.id,
          status: 'disconnected', // Always start as disconnected
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-instances'] });
      toast.success('Instância criada! Clique em "Gerar QR Code" para conectar.');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao criar instância: ${error.message}`);
    },
  });
}

export function useUpdateWhatsAppInstance() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<WhatsAppInstance> & { id: string }) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('whatsapp_instances')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-instances'] });
      toast.success('Instância atualizada!');
    },
    onError: (error: Error) => {
      toast.error(`Erro: ${error.message}`);
    },
  });
}

export function useDeleteWhatsAppInstance() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from('whatsapp_instances')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-instances'] });
      toast.success('Instância removida!');
    },
    onError: (error: Error) => {
      toast.error(`Erro: ${error.message}`);
    },
  });
}

// ============ INSTANCE ACTIONS ============

interface InstanceActionInput {
  action: 'create' | 'connect' | 'status' | 'logout' | 'restart' | 'setWebhook' | 'fetchInstances';
  instanceId: string;
}

export function useWhatsAppInstanceAction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ action, instanceId }: InstanceActionInput) => {
      const { data, error } = await supabase.functions.invoke('whatsapp-instance', {
        body: { action, instanceId },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-instances'] });
      
      const actionMessages: Record<string, string> = {
        create: 'Instância criada na Evolution API!',
        connect: 'Gerando QR Code...',
        status: 'Status atualizado!',
        logout: 'Desconectado com sucesso!',
        restart: 'Instância reiniciada!',
        setWebhook: 'Webhook configurado!',
      };
      
      toast.success(actionMessages[variables.action] || 'Ação executada!');
    },
    onError: (error: Error) => {
      toast.error(`Erro: ${error.message}`);
    },
  });
}

// Sync instance status from Evolution API
export function useSyncInstanceStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (instanceId: string) => {
      const { data, error } = await supabase.functions.invoke('whatsapp-instance', {
        body: { action: 'status', instanceId },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-instances'] });
    },
  });
}

// ============ CONTACTS ============

export function useWhatsAppContacts() {
  return useQuery({
    queryKey: ['whatsapp-contacts'],
    queryFn: async (): Promise<WhatsAppContact[]> => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('whatsapp_contacts')
        .select(`
          *,
          lead:leads(id, name),
          customer:customers(id, name)
        `)
        .order('last_message_at', { ascending: false, nullsFirst: false });

      if (error) throw error;
      return (data || []) as WhatsAppContact[];
    },
  });
}

// Extended contact type with salesperson info
export interface WhatsAppContactWithSalesperson extends WhatsAppContact {
  salesperson?: {
    id: string;
    full_name: string | null;
    avatar_url?: string | null;
  } | null;
}

// Hook for manager view - includes salesperson info
export function useWhatsAppContactsWithSalesperson(salespersonId?: string) {
  return useQuery({
    queryKey: ['whatsapp-contacts-manager', salespersonId],
    queryFn: async (): Promise<WhatsAppContactWithSalesperson[]> => {
      // First get contacts with leads
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: contacts, error } = await (supabase as any)
        .from('whatsapp_contacts')
        .select(`
          *,
          lead:leads(id, name, assigned_to),
          customer:customers(id, name)
        `)
        .order('last_message_at', { ascending: false, nullsFirst: false });

      if (error) throw error;
      if (!contacts || contacts.length === 0) return [];

      // Get unique salesperson IDs from leads
      const salespersonIds = [...new Set(
        contacts
          .map((c: { lead?: { assigned_to?: string } }) => c.lead?.assigned_to)
          .filter(Boolean)
      )] as string[];

      // Fetch profiles for salespeople
      let profilesMap: Record<string, { id: string; full_name: string | null; avatar_url: string | null }> = {};
      
      if (salespersonIds.length > 0) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: profiles } = await (supabase as any)
          .from('profiles')
          .select('id, full_name, avatar_url')
          .in('id', salespersonIds);

        if (profiles) {
          profilesMap = Object.fromEntries(
            profiles.map((p: { id: string; full_name: string | null; avatar_url: string | null }) => [p.id, p])
          );
        }
      }

      // Enrich contacts with salesperson info
      const enrichedContacts = contacts.map((contact: WhatsAppContact & { lead?: { id: string; name: string; assigned_to?: string } }) => ({
        ...contact,
        salesperson: contact.lead?.assigned_to 
          ? profilesMap[contact.lead.assigned_to] || null
          : null,
      }));

      // Filter by salesperson if specified
      if (salespersonId) {
        return enrichedContacts.filter(
          (c: WhatsAppContactWithSalesperson) => c.salesperson?.id === salespersonId
        );
      }

      return enrichedContacts;
    },
  });
}

// ============ MESSAGES ============

export function useWhatsAppMessages(contactId?: string) {
  return useQuery({
    queryKey: ['whatsapp-messages', contactId],
    queryFn: async (): Promise<WhatsAppMessage[]> => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let query = (supabase as any)
        .from('whatsapp_messages')
        .select('*')
        .order('created_at', { ascending: true });

      if (contactId) {
        query = query.eq('contact_id', contactId);
      }

      const { data, error } = await query.limit(100);

      if (error) throw error;
      return (data || []) as WhatsAppMessage[];
    },
    enabled: !!contactId,
  });
}

export function useWhatsAppMessagesByLead(leadId: string) {
  return useQuery({
    queryKey: ['whatsapp-messages-lead', leadId],
    queryFn: async (): Promise<WhatsAppMessage[]> => {
      // Only fetch messages directly linked to this specific lead_id
      // No fallback - if there's no conversation with this lead, show empty chat
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('whatsapp_messages')
        .select('*')
        .eq('lead_id', leadId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching messages for lead:', error);
        return [];
      }

      return (data || []) as WhatsAppMessage[];
    },
    enabled: !!leadId,
    refetchInterval: 3000,
  });
}

export function useWhatsAppMessagesByPhone(phone: string) {
  return useQuery({
    queryKey: ['whatsapp-messages-phone', phone],
    queryFn: async (): Promise<WhatsAppMessage[]> => {
      // Normalize phone to multiple candidate formats
      const digits = phone.replace(/\D/g, '');
      const withCountry = digits.startsWith('55') ? digits : `55${digits}`;
      const withoutCountry = withCountry.replace(/^55/, '');

      // Try multiple phone formats to find the contact
      const candidates = [withCountry, withoutCountry, `+${withCountry}`, `+${withoutCountry}`];

      let contact: { id: string } | null = null;

      for (const candidate of candidates) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data } = await (supabase as any)
          .from('whatsapp_contacts')
          .select('id')
          .eq('phone', candidate)
          .maybeSingle();

        if (data) {
          contact = data;
          break;
        }
      }

      if (!contact) {
        return [];
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('whatsapp_messages')
        .select('*')
        .eq('contact_id', contact.id)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return (data || []) as WhatsAppMessage[];
    },
    enabled: !!phone,
    refetchInterval: 3000, // Poll every 3 seconds for new messages
  });
}

// ============ SEND MESSAGE ============

interface SendMessageInput {
  phone: string;
  message: string;
  instanceId?: string;
  leadId?: string;
  userId?: string;
}

export function useSendWhatsAppMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: SendMessageInput) => {
      const { data, error } = await supabase.functions.invoke('whatsapp-send', {
        body: input,
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (_, variables) => {
      // Invalidate messages queries to refresh the chat
      if (variables.leadId) {
        queryClient.invalidateQueries({ queryKey: ['whatsapp-messages-lead', variables.leadId] });
      }
      queryClient.invalidateQueries({ queryKey: ['whatsapp-messages-phone', variables.phone] });
      queryClient.invalidateQueries({ queryKey: ['whatsapp-contacts'] });
    },
    onError: (error: Error) => {
      toast.error(`Erro ao enviar mensagem: ${error.message}`);
    },
  });
}

// ============ TEMPLATES ============

export function useWhatsAppTemplates() {
  return useQuery({
    queryKey: ['whatsapp-templates'],
    queryFn: async (): Promise<WhatsAppTemplate[]> => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('whatsapp_templates')
        .select('*')
        .eq('is_active', true)
        .order('category', { ascending: true });

      if (error) throw error;
      return (data || []) as WhatsAppTemplate[];
    },
  });
}

export function useCreateWhatsAppTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: Omit<WhatsAppTemplate, 'id' | 'created_at' | 'updated_at'>) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('whatsapp_templates')
        .insert({
          ...input,
          created_by: user?.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-templates'] });
      toast.success('Template criado!');
    },
    onError: (error: Error) => {
      toast.error(`Erro: ${error.message}`);
    },
  });
}

export function useDeleteWhatsAppTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from('whatsapp_templates')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-templates'] });
      toast.success('Template removido!');
    },
    onError: (error: Error) => {
      toast.error(`Erro: ${error.message}`);
    },
  });
}
