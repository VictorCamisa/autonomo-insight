import { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Loader2, Volume2, Mic, MicOff, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { useAgentChat, ChatMessage } from '@/hooks/useAgentChat';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface AgentChatPanelProps {
  agentId: string;
  className?: string;
}

export default function AgentChatPanel({ agentId, className }: AgentChatPanelProps) {
  const [input, setInput] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  
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

  const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        // Remove the data URL prefix (e.g., "data:audio/webm;base64,")
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  const transcribeAudio = async (audioBlob: Blob): Promise<string | null> => {
    try {
      setIsTranscribing(true);
      console.log('[AgentChatPanel] Transcribing audio, size:', audioBlob.size);
      
      const base64Audio = await blobToBase64(audioBlob);
      console.log('[AgentChatPanel] Base64 length:', base64Audio.length);

      const { data, error } = await supabase.functions.invoke('transcribe-audio', {
        body: { audio: base64Audio },
      });

      if (error) {
        console.error('[AgentChatPanel] Transcription error:', error);
        throw error;
      }

      console.log('[AgentChatPanel] Transcription result:', data);
      return data?.text || null;
    } catch (error) {
      console.error('[AgentChatPanel] Failed to transcribe:', error);
      toast.error('Erro ao transcrever áudio');
      return null;
    } finally {
      setIsTranscribing(false);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        stream.getTracks().forEach(track => track.stop());
        
        // Transcribe the audio
        const transcribedText = await transcribeAudio(audioBlob);
        
        if (transcribedText && transcribedText.trim()) {
          // Send the transcribed message with isAudio flag for voice response
          sendMessage(transcribedText, { isAudio: true });
        } else {
          toast.error('Não foi possível entender o áudio. Tente novamente.');
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
      toast.info('Gravando... Clique novamente para parar.');
    } catch (error) {
      console.error('Error accessing microphone:', error);
      toast.error('Erro ao acessar microfone. Verifique as permissões.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const playAudio = (audioUrl: string) => {
    const audio = new Audio(audioUrl);
    audio.play().catch(e => console.warn('Playback blocked:', e));
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
        <div className="space-y-6">
          {messages.length === 0 && (
            <div className="text-center text-muted-foreground py-8">
              <Bot className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>Envie uma mensagem para começar a conversa</p>
              <p className="text-sm mt-1">
                Experimente: "Quais carros vocês têm disponíveis?"
              </p>
            </div>
          )}
          
          {messages.map((message, index) => (
            <MessageBubble 
              key={message.id} 
              message={message} 
              onPlayAudio={playAudio}
              showDivider={index > 0 && messages[index - 1].role !== message.role}
            />
          ))}
        </div>
      </ScrollArea>

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-4 border-t">
        <div className="flex gap-2">
          <Button
            type="button"
            size="icon"
            variant={isRecording ? "destructive" : "outline"}
            onClick={isRecording ? stopRecording : startRecording}
            disabled={isLoading || isTranscribing}
          >
            {isTranscribing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : isRecording ? (
              <MicOff className="h-4 w-4" />
            ) : (
              <Mic className="h-4 w-4" />
            )}
          </Button>
          <Input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={isRecording ? "Gravando áudio..." : isTranscribing ? "Transcrevendo..." : "Digite sua mensagem..."}
            disabled={isLoading || isRecording || isTranscribing}
            className="flex-1"
          />
          <Button type="submit" disabled={isLoading || !input.trim() || isRecording || isTranscribing}>
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
  onPlayAudio,
  showDivider,
}: { 
  message: ChatMessage; 
  onPlayAudio: (url: string) => void;
  showDivider?: boolean;
}) {
  const isUser = message.role === 'user';

  return (
    <>
      {showDivider && (
        <div className="flex items-center gap-2 my-4">
          <div className="flex-1 h-px bg-border" />
          <span className="text-xs text-muted-foreground">
            {isUser ? 'Você' : 'Assistente'}
          </span>
          <div className="flex-1 h-px bg-border" />
        </div>
      )}
      <div className={cn("flex gap-3", isUser && "flex-row-reverse")}>
        <div className={cn(
          "h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0",
          isUser ? "bg-primary text-primary-foreground" : "bg-muted"
        )}>
          {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
        </div>
        
        <div className={cn(
          "max-w-[80%] rounded-lg px-4 py-3 shadow-sm",
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
            <div className="space-y-2">
              {/* Image if present */}
              {message.imageUrl && (
                <img 
                  src={message.imageUrl} 
                  alt="Imagem enviada" 
                  className="rounded-md max-w-full max-h-48 object-cover"
                />
              )}
              
              {/* Text content - render with proper formatting */}
              <div className="text-sm whitespace-pre-wrap leading-relaxed">
                {formatMessageContent(message.content)}
              </div>
              
              {/* Audio button if present */}
              {message.audioUrl && (
                <Button
                  size="sm"
                  variant={isUser ? "secondary" : "ghost"}
                  className="mt-2 h-8 text-xs gap-1.5"
                  onClick={() => onPlayAudio(message.audioUrl!)}
                >
                  <Volume2 className="h-3.5 w-3.5" />
                  Ouvir resposta
                </Button>
              )}
              
              {/* Timestamp */}
              <p className={cn(
                "text-[10px] mt-1",
                isUser ? "text-primary-foreground/60" : "text-muted-foreground"
              )}>
                {message.timestamp.toLocaleTimeString('pt-BR', { 
                  hour: '2-digit', 
                  minute: '2-digit' 
                })}
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// Format message content to handle markdown-like formatting
function formatMessageContent(content: string): React.ReactNode {
  // Split by double newlines to create paragraphs
  const paragraphs = content.split(/\n\n+/);
  
  if (paragraphs.length <= 1) {
    return content;
  }
  
  return (
    <div className="space-y-3">
      {paragraphs.map((paragraph, index) => (
        <p key={index}>{paragraph}</p>
      ))}
    </div>
  );
}
