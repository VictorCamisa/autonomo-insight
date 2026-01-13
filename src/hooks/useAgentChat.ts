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
      // First, try to get the agent config
      const { data: agent } = await supabase
        .from('ai_agents')
        .select('*')
        .eq('id', agentId)
        .single();

      const systemPrompt = (agent as any)?.system_prompt || 'Você é um assistente virtual da loja Matheus Veículos. Seja prestativo e cordial.';

      // Build conversation history
      const allMessages = [...messages, userMessage];
      const historyMessages = allMessages.slice(-10).map(m => ({
        role: m.role,
        content: m.content,
      }));

      // Build the full message with context
      const fullMessage = `[Contexto do Sistema: ${systemPrompt}]

Histórico da conversa:
${historyMessages.slice(0, -1).map(m => `${m.role === 'user' ? 'Usuário' : 'Assistente'}: ${m.content}`).join('\n')}

Usuário: ${content}`;

      // Call the generate-report function which uses Lovable AI
      const { data, error } = await supabase.functions.invoke('generate-report', {
        body: { message: fullMessage },
      });

      if (error) {
        console.error('Function error:', error);
        throw error;
      }

      const aiResponse = data?.response || data?.content || 'Desculpe, não consegui processar sua mensagem.';

      // Remove loading and add real response
      setMessages(prev => {
        const filtered = prev.filter(m => m.id !== loadingId);
        return [...filtered, {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: aiResponse,
          timestamp: new Date(),
        }];
      });

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
