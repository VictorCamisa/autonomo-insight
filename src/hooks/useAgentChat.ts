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
  imageUrl?: string;
  dataSourcesUsed?: string[];
}

interface UseAgentChatOptions {
  agentId: string;
  sessionId?: string;
  onError?: (error: Error) => void;
}

interface SendMessageOptions {
  isAudio?: boolean;
  imageUrl?: string;
}

export function useAgentChat({ agentId, sessionId, onError }: UseAgentChatOptions) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);

  const sendMessage = useCallback(async (content: string, options: SendMessageOptions = {}) => {
    if (!content.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: content.trim(),
      timestamp: new Date(),
      imageUrl: options.imageUrl,
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
      // Build conversation history from previous messages
      const allMessages = [...messages, userMessage];
      const conversationHistory = allMessages.slice(-10).map(m => ({
        role: m.role,
        content: m.content,
      }));

      // Try the dedicated ai-agent-chat function first
      let data, error;
      
      try {
        const result = await supabase.functions.invoke('ai-agent-chat', {
          body: {
            message: content,
            agent_id: agentId,
            conversation_history: conversationHistory.slice(0, -1), // Exclude the current message
            session_id: sessionId,
            is_audio_message: options.isAudio || false,
          },
        });
        data = result.data;
        error = result.error;
      } catch (e) {
        console.warn('[useAgentChat] ai-agent-chat failed, trying generate-report:', e);
        
        // Fallback to generate-report
        const fallbackResult = await supabase.functions.invoke('generate-report', {
          body: { message: content },
        });
        data = fallbackResult.data;
        error = fallbackResult.error;
      }

      if (error) {
        console.error('Function error:', error);
        throw error;
      }

      const aiResponse = data?.response || data?.content || 'Desculpe, não consegui processar sua mensagem.';
      const dataSourcesUsed = data?.data_sources_used || [];
      const audioContent = data?.audio_content;

      // Create audio URL from base64 if present
      let audioUrl: string | undefined;
      if (audioContent) {
        audioUrl = `data:audio/mpeg;base64,${audioContent}`;
      }

      // Remove loading and add real response
      setMessages(prev => {
        const filtered = prev.filter(m => m.id !== loadingId);
        return [...filtered, {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: aiResponse,
          timestamp: new Date(),
          dataSourcesUsed,
          audioUrl,
        }];
      });

      // Auto-play audio if it was an audio message and we got audio back
      if (audioUrl && options.isAudio) {
        setTimeout(() => {
          const audio = new Audio(audioUrl);
          audio.play().catch(e => console.warn('Auto-play blocked:', e));
        }, 100);
      }

    } catch (error) {
      console.error('Chat error:', error);
      
      // Remove loading placeholder
      setMessages(prev => prev.filter(m => m.id !== loadingId));
      
      // Fallback: provide a simple response
      const fallbackResponse = getFallbackResponse(content);
      setMessages(prev => [...prev, {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: fallbackResponse,
        timestamp: new Date(),
      }]);
      
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      console.warn(`Usando resposta de fallback devido a: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  }, [agentId, sessionId, conversationId, isLoading, messages, onError]);

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

// Fallback responses when API is unavailable
function getFallbackResponse(userMessage: string): string {
  const lower = userMessage.toLowerCase();
  
  if (lower.includes('olá') || lower.includes('oi') || lower.includes('bom dia') || lower.includes('boa tarde') || lower.includes('boa noite')) {
    return 'Olá! Bem-vindo à Matheus Veículos! 🚗 Como posso ajudá-lo hoje? Estou aqui para tirar suas dúvidas sobre nossos veículos, financiamento ou agendar uma visita.';
  }
  
  if (lower.includes('carro') || lower.includes('veículo') || lower.includes('automóvel')) {
    return 'Temos uma grande variedade de veículos disponíveis! Para que eu possa ajudá-lo melhor, poderia me dizer: qual marca ou modelo você está procurando? Qual sua faixa de preço?';
  }
  
  if (lower.includes('financ') || lower.includes('parcela')) {
    return 'Trabalhamos com as melhores condições de financiamento do mercado! 💳 Podemos simular parcelas que cabem no seu bolso. Qual veículo você tem interesse?';
  }
  
  if (lower.includes('visita') || lower.includes('test') || lower.includes('agendar')) {
    return 'Ótimo! Ficaremos felizes em recebê-lo! 📅 Nossa loja funciona de segunda a sábado, das 8h às 18h. Qual dia e horário seria melhor para você?';
  }
  
  if (lower.includes('preço') || lower.includes('valor') || lower.includes('quanto')) {
    return 'Os valores variam conforme o veículo escolhido. Temos opções a partir de R$ 25.000. Qual modelo você gostaria de saber o preço?';
  }
  
  return 'Entendi! Estou aqui para ajudar com informações sobre nossos veículos, financiamento, ou agendar uma visita. O que você gostaria de saber?';
}
