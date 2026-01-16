import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import type { AppRole } from '@/types/database';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  role: AppRole | null;
  loading: boolean;
  roleLoading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function sanitizeSession(session: Session | null): Session | null {
  if (!session?.access_token) return null;
  return session;
}

function isRefreshTokenNotFound(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const anyErr = error as { code?: string; message?: string };
  return anyErr.code === 'refresh_token_not_found' || (anyErr.message ?? '').includes('Refresh Token Not Found');
}

// Prioridade dos roles - gerente é o mais alto
const ROLE_PRIORITY: Record<string, number> = {
  gerente: 3,
  marketing: 2,
  vendedor: 1,
};

async function fetchUserRole(userId: string): Promise<AppRole | null> {
  console.log('[AuthContext] Fetching role for user:', userId);
  try {
    // Busca TODOS os roles do usuário (pode ter mais de um)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('user_roles')
      .select('role')
      .eq('user_id', userId);
    
    console.log('[AuthContext] Role query result:', { data, error });
    
    if (error || !data || data.length === 0) {
      if (error) console.error('[AuthContext] Error fetching user role:', error);
      return null;
    }
    
    // Se tiver múltiplos roles, pega o de maior prioridade (gerente > marketing > vendedor)
    const roles = data.map((r: { role: string }) => r.role);
    const highestRole = roles.sort((a: string, b: string) => 
      (ROLE_PRIORITY[b] || 0) - (ROLE_PRIORITY[a] || 0)
    )[0];
    
    console.log('[AuthContext] User roles found:', roles, '- Using highest:', highestRole);
    return highestRole as AppRole;
  } catch (err) {
    console.error('[AuthContext] Error fetching user role:', err);
    return null;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [roleLoading, setRoleLoading] = useState(false);
  
  // Use ref to track initialization without causing re-renders
  const isInitializedRef = useRef(false);
  const currentUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    console.log('[AuthContext] Initializing...');

    const processSession = async (newSession: Session | null, source: string) => {
      console.log(`[AuthContext] processSession from ${source}:`, !!newSession?.user);
      const sanitized = sanitizeSession(newSession);
      
      if (!isMounted) {
        console.log('[AuthContext] Component unmounted, skipping...');
        return;
      }
      
      setSession(sanitized);
      setUser(sanitized?.user ?? null);
      currentUserIdRef.current = sanitized?.user?.id ?? null;

      if (sanitized?.user) {
        console.log('[AuthContext] User found, fetching role...');
        setRoleLoading(true);
        const userRole = await fetchUserRole(sanitized.user.id);
        console.log('[AuthContext] Role fetched:', userRole);
        if (isMounted) {
          setRole(userRole);
          setRoleLoading(false);
          setLoading(false);
          isInitializedRef.current = true;
          console.log('[AuthContext] State updated - initialized: true');
        }
      } else {
        console.log('[AuthContext] No user, clearing state...');
        setRole(null);
        setRoleLoading(false);
        setLoading(false);
        isInitializedRef.current = true;
      }
    };

    // Set up the auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, newSession) => {
      console.log('[AuthContext] onAuthStateChange event:', event, 'isInitialized:', isInitializedRef.current);
      
      if ((event as unknown as string) === 'TOKEN_REFRESH_FAILED') {
        supabase.auth.signOut().catch(() => {});
        return;
      }
      
      // CRITICAL: After initialization, ONLY respond to SIGNED_OUT events
      // This prevents re-renders when switching browser tabs (which triggers TOKEN_REFRESHED, SIGNED_IN, etc.)
      if (isInitializedRef.current) {
        if (event === 'SIGNED_OUT') {
          console.log('[AuthContext] User signed out, clearing state...');
          setSession(null);
          setUser(null);
          setRole(null);
          currentUserIdRef.current = null;
        } else if (event === 'SIGNED_IN' && newSession?.user?.id !== currentUserIdRef.current) {
          // Only process SIGNED_IN if it's a DIFFERENT user (actual new login)
          console.log('[AuthContext] Different user signed in, processing...');
          setTimeout(() => {
            processSession(newSession, 'onAuthStateChange');
          }, 0);
        } else {
          console.log('[AuthContext] Ignoring auth event after initialization to preserve UI state (modals, forms, etc.)');
        }
        return;
      }
      
      // Use setTimeout to defer and avoid Supabase deadlock
      setTimeout(() => {
        processSession(newSession, 'onAuthStateChange');
      }, 0);
    });

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session: currentSession }, error }) => {
      console.log('[AuthContext] getSession result:', !!currentSession, error);
      if (error) {
        console.error('[AuthContext] Error getting session:', error);
        if (isRefreshTokenNotFound(error)) {
          supabase.auth.signOut().catch(() => {});
        }
        if (isMounted) {
          setLoading(false);
          isInitializedRef.current = true;
        }
        return;
      }
      
      processSession(currentSession, 'getSession');
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    // Reset initialization flag to allow processing the new sign in
    isInitializedRef.current = false;
    
    // Limpar todo o cache antes do login para evitar dados de outro usuário
    queryClient.clear();
    // Limpar insights dismissados para nova sessão
    localStorage.removeItem('dismissedMarketingInsights');
    
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    return { error };
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    const redirectUrl = `${window.location.origin}/`;

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          full_name: fullName,
        },
      },
    });
    return { error };
  };

  const signOut = async () => {
    // Limpar todo o cache ao fazer logout
    queryClient.clear();
    await supabase.auth.signOut();
    setRole(null);
    isInitializedRef.current = false;
  };

  return (
    <AuthContext.Provider value={{ user, session, role, loading, roleLoading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
