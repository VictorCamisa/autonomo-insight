import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { 
  UserProfile, 
  UserWithRoles, 
  UserPermission, 
  ActivityLog, 
  AppRole, 
  ModuleName, 
  PermissionType 
} from '@/types/users';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

// Fetch all users with their roles
export function useUsersWithRoles() {
  return useQuery({
    queryKey: ['users-with-roles'],
    queryFn: async (): Promise<UserWithRoles[]> => {
      // Fetch profiles
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: profiles, error: profilesError } = await (supabase as any)
        .from('profiles')
        .select('*')
        .order('full_name');

      if (profilesError) throw profilesError;

      // Fetch all roles
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: roles, error: rolesError } = await (supabase as any)
        .from('user_roles')
        .select('*');

      if (rolesError) throw rolesError;

      // Fetch all permissions
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: permissions, error: permissionsError } = await (supabase as any)
        .from('user_permissions')
        .select('*');

      if (permissionsError) throw permissionsError;

      // Map profiles with their roles and permissions
      return (profiles || []).map((profile: UserProfile) => ({
        ...profile,
        roles: (roles || [])
          .filter((r: { user_id: string }) => r.user_id === profile.id)
          .map((r: { role: AppRole }) => r.role),
        permissions: (permissions || []).filter(
          (p: UserPermission) => p.user_id === profile.id
        ),
      }));
    },
  });
}

// Sincroniza Auth users -> profiles (Admin only)
export function useSyncUsers() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        throw new Error('Você precisa estar logado');
      }

      const response = await fetch(`${SUPABASE_URL}/functions/v1/sync-users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Erro ao sincronizar usuários');
      }

      return data as { success: boolean; result: { processed: number; upserted: number } };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['users-with-roles'] });
      toast({
        title: 'Usuários sincronizados!',
        description: `${data.result.upserted} perfis atualizados.`,
      });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao sincronizar', description: error.message, variant: 'destructive' });
    },
  });
}


export function useUserDetails(userId: string | null) {
  return useQuery({
    queryKey: ['user-details', userId],
    queryFn: async (): Promise<UserWithRoles | null> => {
      if (!userId) return null;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: profile, error: profileError } = await (supabase as any)
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (profileError) throw profileError;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: roles, error: rolesError } = await (supabase as any)
        .from('user_roles')
        .select('role')
        .eq('user_id', userId);

      if (rolesError) throw rolesError;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: permissions, error: permissionsError } = await (supabase as any)
        .from('user_permissions')
        .select('*')
        .eq('user_id', userId);

      if (permissionsError) throw permissionsError;

      return {
        ...profile,
        roles: (roles || []).map((r: { role: AppRole }) => r.role),
        permissions: permissions || [],
      };
    },
    enabled: !!userId,
  });
}

// Create a new user
export function useCreateUser() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      email: string;
      password: string;
      full_name: string;
      roles: AppRole[];
      permissions: { module: ModuleName; permission: PermissionType }[];
    }) => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('Você precisa estar logado');
      }

      // Create user via edge function
      const response = await fetch(`${SUPABASE_URL}/functions/v1/create-user`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          email: input.email,
          password: input.password,
          full_name: input.full_name,
          role: input.roles[0] || 'vendedor', // Primary role
        }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Erro ao criar usuário');
      }

      const userId = data.user?.id;
      if (!userId) throw new Error('ID do usuário não retornado');

      // Add additional roles (if more than one)
      for (const role of input.roles.slice(1)) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase as any)
          .from('user_roles')
          .insert({ user_id: userId, role });
      }

      // Add permissions
      if (input.permissions.length > 0) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error: permError } = await (supabase as any)
          .from('user_permissions')
          .insert(
            input.permissions.map(p => ({
              user_id: userId,
              module: p.module,
              permission: p.permission,
              granted_by: session.user.id,
            }))
          );
        if (permError) throw permError;
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users-with-roles'] });
      toast({ title: 'Usuário criado com sucesso!' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao criar usuário', description: error.message, variant: 'destructive' });
    },
  });
}

// Update user profile
export function useUpdateUser() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      userId: string;
      full_name?: string;
      is_active?: boolean;
      is_master?: boolean;
    }) => {
      const updateData: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
      };
      
      if (input.full_name !== undefined) updateData.full_name = input.full_name;
      if (input.is_active !== undefined) updateData.is_active = input.is_active;
      if (input.is_master !== undefined) updateData.is_master = input.is_master;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from('profiles')
        .update(updateData)
        .eq('id', input.userId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users-with-roles'] });
      queryClient.invalidateQueries({ queryKey: ['user-details'] });
      toast({ title: 'Usuário atualizado com sucesso!' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao atualizar usuário', description: error.message, variant: 'destructive' });
    },
  });
}

// Update user email/password (Master only)
export function useUpdateUserAuth() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      userId: string;
      email?: string;
      password?: string;
    }) => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('Você precisa estar logado');
      }

      const response = await fetch(`${SUPABASE_URL}/functions/v1/update-user-auth`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          user_id: input.userId,
          email: input.email,
          password: input.password,
        }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Erro ao atualizar credenciais');
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users-with-roles'] });
      queryClient.invalidateQueries({ queryKey: ['user-details'] });
      toast({ title: 'Credenciais atualizadas com sucesso!' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao atualizar credenciais', description: error.message, variant: 'destructive' });
    },
  });
}

// Update user roles
export function useUpdateUserRoles() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { userId: string; roles: AppRole[] }) => {
      // Delete existing roles
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: deleteError } = await (supabase as any)
        .from('user_roles')
        .delete()
        .eq('user_id', input.userId);

      if (deleteError) throw deleteError;

      // Insert new roles
      if (input.roles.length > 0) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error: insertError } = await (supabase as any)
          .from('user_roles')
          .insert(input.roles.map(role => ({ user_id: input.userId, role })));

        if (insertError) throw insertError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users-with-roles'] });
      queryClient.invalidateQueries({ queryKey: ['user-details'] });
      toast({ title: 'Funções atualizadas com sucesso!' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao atualizar funções', description: error.message, variant: 'destructive' });
    },
  });
}

// Update user permissions
export function useUpdateUserPermissions() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      userId: string;
      permissions: { module: ModuleName; permission: PermissionType }[];
    }) => {
      const { data: { user } } = await supabase.auth.getUser();

      // Delete existing permissions
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: deleteError } = await (supabase as any)
        .from('user_permissions')
        .delete()
        .eq('user_id', input.userId);

      if (deleteError) throw deleteError;

      // Insert new permissions
      if (input.permissions.length > 0) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error: insertError } = await (supabase as any)
          .from('user_permissions')
          .insert(
            input.permissions.map(p => ({
              user_id: input.userId,
              module: p.module,
              permission: p.permission,
              granted_by: user?.id,
            }))
          );

        if (insertError) throw insertError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users-with-roles'] });
      queryClient.invalidateQueries({ queryKey: ['user-details'] });
      toast({ title: 'Permissões atualizadas com sucesso!' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao atualizar permissões', description: error.message, variant: 'destructive' });
    },
  });
}

// Fetch activity logs
export function useActivityLogs(filters?: { userId?: string; entityType?: string; limit?: number }) {
  return useQuery({
    queryKey: ['activity-logs', filters],
    queryFn: async (): Promise<ActivityLog[]> => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let query = (supabase as any)
        .from('activity_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(filters?.limit || 100);

      if (filters?.userId) {
        query = query.eq('user_id', filters.userId);
      }

      if (filters?.entityType) {
        query = query.eq('entity_type', filters.entityType);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Fetch user profiles for logs
      const userIds = [...new Set((data || []).map((log: ActivityLog) => log.user_id).filter(Boolean))];
      
      if (userIds.length > 0) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: profiles } = await (supabase as any)
          .from('profiles')
          .select('id, full_name')
          .in('id', userIds);

        const profileMap = new Map((profiles || []).map((p: { id: string; full_name: string }) => [p.id, p]));

        return (data || []).map((log: ActivityLog) => ({
          ...log,
          user_profile: log.user_id ? profileMap.get(log.user_id) : null,
        }));
      }

      return data || [];
    },
  });
}

// Log an activity
export function useLogActivity() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      action: string;
      entity_type: string;
      entity_id?: string;
      details?: Record<string, unknown>;
    }) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from('activity_logs')
        .insert({
          action: input.action,
          entity_type: input.entity_type,
          entity_id: input.entity_id,
          details: input.details,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activity-logs'] });
    },
  });
}
