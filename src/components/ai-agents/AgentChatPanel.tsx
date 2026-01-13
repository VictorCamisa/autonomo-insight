import { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Loader2, Volume2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { useAgentChat, ChatMessage } from '@/hooks/useAgentChat';

interface AgentChatPanelProps {
  agentId: string;
  className?: string;
}

export default function AgentChatPanel({ agentId, className }: AgentChatPanelProps) {
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  
  const { messages, isLoading, sendMessage } = useAgentChat({ agentId });

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    
    sendMessage(input);
    setInput('');
  };

  const playAudio = (audioUrl: string) => {
    const audio = new Audio(audioUrl);
    audio.play();
  };

  return (
    <div className={cn("flex flex-col h-full border rounded-lg bg-background", className)}>
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b">
        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
          <Bot className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h3 className="font-medium">Chat de Teste</h3>
          <p className="text-xs text-muted-foreground">
            {isLoading ? 'Digitando...' : 'Online'}
          </p>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        <div className="space-y-4">
          {messages.length === 0 && (
            <div className="text-center text-muted-foreground py-8">
              <Bot className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>Envie uma mensagem para começar a conversa</p>
              <p className="text-sm mt-1">
                Experimente: "Quais carros vocês têm disponíveis?"
              </p>
            </div>
          )}
          
          {messages.map((message) => (
            <MessageBubble 
              key={message.id} 
              message={message} 
              onPlayAudio={playAudio}
            />
          ))}
        </div>
      </ScrollArea>

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-4 border-t">
        <div className="flex gap-2">
          <Input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Digite sua mensagem..."
            disabled={isLoading}
            className="flex-1"
          />
          <Button type="submit" disabled={isLoading || !input.trim()}>
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}

function MessageBubble({ 
  message, 
  onPlayAudio 
}: { 
  message: ChatMessage; 
  onPlayAudio: (url: string) => void;
}) {
  const isUser = message.role === 'user';

  return (
    <div className={cn("flex gap-3", isUser && "flex-row-reverse")}>
      <div className={cn(
        "h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0",
        isUser ? "bg-primary text-primary-foreground" : "bg-muted"
      )}>
        {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
      </div>
      
      <div className={cn(
        "max-w-[80%] rounded-lg px-4 py-2",
        isUser 
          ? "bg-primary text-primary-foreground" 
          : "bg-muted",
        message.isLoading && "animate-pulse"
      )}>
        {message.isLoading ? (
          <div className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Pensando...</span>
          </div>
        ) : (
          <>
            <p className="text-sm whitespace-pre-wrap">{message.content}</p>
            
            {message.audioUrl && (
              <Button
                size="sm"
                variant="ghost"
                className="mt-2 h-7 text-xs gap-1"
                onClick={() => onPlayAudio(message.audioUrl!)}
              >
                <Volume2 className="h-3 w-3" />
                Ouvir
              </Button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
