import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
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
      const { data, error } = await supabase.functions.invoke('ai-agent-chat', {
        body: {
          agent_id: agentId,
          message: content.trim(),
          session_id: sessionId || `session-${Date.now()}`,
          conversation_id: conversationId,
        },
      });

      if (error) throw error;

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
      console.error('Chat error:', error);
      
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
