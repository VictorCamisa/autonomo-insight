import { useState, useCallback } from 'react';
import { toast } from 'sonner';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  isLoading?: boolean;
  audioUrl?: string;
}

interface UseAgentChatOptions {
  agentId: string;
  sessionId?: string;
  onError?: (error: Error) => void;
}

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export function useAgentChat({ agentId, sessionId, onError }: UseAgentChatOptions) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);

  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: content.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    // Add loading placeholder
    const loadingId = `loading-${Date.now()}`;
    setMessages(prev => [...prev, {
      id: loadingId,
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      isLoading: true,
    }]);

    try {
      console.log('[useAgentChat] Sending request to edge function...');
      
      const response = await fetch(`${SUPABASE_URL}/functions/v1/ai-agent-chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'apikey': SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({
          agent_id: agentId,
          message: content.trim(),
          session_id: sessionId || `session-${Date.now()}`,
          conversation_id: conversationId,
        }),
      });

      console.log('[useAgentChat] Response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[useAgentChat] Error response:', errorText);
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      console.log('[useAgentChat] Response data:', data);

      if (data.error) {
        throw new Error(data.error);
      }

      // Remove loading and add real response
      setMessages(prev => {
        const filtered = prev.filter(m => m.id !== loadingId);
        return [...filtered, {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: data.response || data.message || 'Sem resposta',
          timestamp: new Date(),
          audioUrl: data.audio_url,
        }];
      });

      if (data.conversation_id) {
        setConversationId(data.conversation_id);
      }

    } catch (error) {
      console.error('[useAgentChat] Chat error:', error);
      
      // Remove loading placeholder
      setMessages(prev => prev.filter(m => m.id !== loadingId));
      
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      toast.error(`Erro ao enviar mensagem: ${errorMessage}`);
      onError?.(error instanceof Error ? error : new Error(errorMessage));
    } finally {
      setIsLoading(false);
    }
  }, [agentId, sessionId, conversationId, isLoading, onError]);

  const clearMessages = useCallback(() => {
    setMessages([]);
    setConversationId(null);
  }, []);

  return {
    messages,
    isLoading,
    sendMessage,
    clearMessages,
    conversationId,
  };
}
