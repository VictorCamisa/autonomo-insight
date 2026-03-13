import { useState, useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { 
  Send, 
  MessageSquare, 
  Clock, 
  Check, 
  CheckCheck, 
  Loader2, 
  AlertCircle, 
  FileText, 
  WifiOff,
  X,
  Image,
  Mic,
  Paperclip,
  Smile,
  Phone,
  MoreVertical,
  Search
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';
import { useWhatsAppInstanceAction, useWhatsAppInstances, useWhatsAppMessagesByPhone, useSendWhatsAppMessage, useWhatsAppTemplates, useUserWhatsAppInstance } from '@/hooks/useWhatsApp';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { format, differenceInMinutes, isToday, isYesterday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { WhatsAppMessageStatus } from '@/types/whatsapp';
import { toast } from 'sonner';

interface WhatsAppChatModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  leadId: string;
  phone: string;
  leadName: string;
  lastCustomerMessageAt?: string;
}

const statusIcons: Record<WhatsAppMessageStatus, React.ReactNode> = {
  pending: <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />,
  sent: <Check className="h-3 w-3 text-muted-foreground" />,
  delivered: <CheckCheck className="h-3 w-3 text-muted-foreground" />,
  read: <CheckCheck className="h-3 w-3 text-emerald-500" />,
  failed: <AlertCircle className="h-3 w-3 text-destructive" />,
};

function formatMessageDate(date: Date): string {
  if (isToday(date)) return 'Hoje';
  if (isYesterday(date)) return 'Ontem';
  return format(date, "d 'de' MMMM", { locale: ptBR });
}

export function WhatsAppChatModal({ 
  open, 
  onOpenChange, 
  leadId, 
  phone, 
  leadName, 
  lastCustomerMessageAt 
}: WhatsAppChatModalProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: messages = [], isLoading } = useWhatsAppMessagesByPhone(phone);
  const { data: templates = [] } = useWhatsAppTemplates();
  const { data: userInstance, isLoading: isLoadingInstance } = useUserWhatsAppInstance(user?.id || '');
  const instanceAction = useWhatsAppInstanceAction();
  const sendMessage = useSendWhatsAppMessage();

  const [message, setMessage] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const didAttemptWebhookRef = useRef(false);

  const isConnected = userInstance?.status === 'connected';

  // Ensure Evolution webhook is configured
  useEffect(() => {
    if (!userInstance?.id || !isConnected) return;
    if (didAttemptWebhookRef.current) return;

    if (!userInstance.webhook_url) {
      didAttemptWebhookRef.current = true;
      instanceAction.mutate({ action: 'setWebhook', instanceId: userInstance.id });
    }
  }, [userInstance?.id, userInstance?.webhook_url, isConnected]);

  // Realtime updates
  useEffect(() => {
    const channel = supabase
      .channel(`lead-wa-modal-${leadId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'whatsapp_messages' },
        (payload) => {
          const newRow = payload.new as { lead_id?: string };
          if (newRow?.lead_id === leadId) {
            queryClient.invalidateQueries({ queryKey: ['whatsapp-messages-phone', phone] });
            queryClient.invalidateQueries({ queryKey: ['whatsapp-contacts'] });
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'whatsapp_messages' },
        (payload) => {
          const updatedRow = payload.new as { lead_id?: string };
          if (updatedRow?.lead_id === leadId) {
            queryClient.invalidateQueries({ queryKey: ['whatsapp-messages-phone', phone] });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [leadId, phone, queryClient]);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!message.trim()) return;

    await sendMessage.mutateAsync({
      phone,
      message: message.trim(),
      leadId,
      userId: user?.id,
    });

    setMessage('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const applyTemplate = (content: string) => {
    let processed = content
      .replace(/\{nome\}/g, leadName.split(' ')[0])
      .replace(/\{nome_completo\}/g, leadName);
    setMessage(processed);
  };

  const handleFileSelect = (type: 'image' | 'document') => {
    if (type === 'image') {
      imageInputRef.current?.click();
    } else {
      fileInputRef.current?.click();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'image' | 'document') => {
    const file = e.target.files?.[0];
    if (file) {
      toast.info(`Envio de ${type === 'image' ? 'imagens' : 'documentos'} em breve!`, {
        description: 'Funcionalidade em desenvolvimento'
      });
    }
  };

  const handleAudioRecord = () => {
    setIsRecording(!isRecording);
    if (!isRecording) {
      toast.info('Gravação de áudio em breve!', {
        description: 'Funcionalidade em desenvolvimento'
      });
    }
  };

  // Calculate SLA timer
  const slaMinutes = lastCustomerMessageAt 
    ? differenceInMinutes(new Date(), new Date(lastCustomerMessageAt))
    : null;

  const getSlaColor = () => {
    if (!slaMinutes) return null;
    if (slaMinutes < 5) return 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20';
    if (slaMinutes < 15) return 'text-amber-500 bg-amber-500/10 border-amber-500/20';
    return 'text-red-500 bg-red-500/10 border-red-500/20 animate-pulse';
  };

  // Group messages by date
  const groupedMessages = messages.reduce((groups, msg) => {
    const date = format(new Date(msg.created_at), 'yyyy-MM-dd');
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(msg);
    return groups;
  }, {} as Record<string, typeof messages>);

  const initials = leadName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl h-[85vh] p-0 gap-0 overflow-hidden flex flex-col bg-gradient-to-b from-background to-muted/20">
        {/* Hidden file inputs */}
        <input 
          type="file" 
          ref={imageInputRef} 
          className="hidden" 
          accept="image/*"
          onChange={(e) => handleFileChange(e, 'image')}
        />
        <input 
          type="file" 
          ref={fileInputRef} 
          className="hidden" 
          accept=".pdf,.doc,.docx,.xls,.xlsx,.txt"
          onChange={(e) => handleFileChange(e, 'document')}
        />

        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b bg-gradient-to-r from-emerald-600 to-emerald-500 text-white">
          <Avatar className="h-10 w-10 border-2 border-white/20">
            <AvatarFallback className="bg-white/20 text-white font-semibold">
              {initials}
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold truncate">{leadName}</h3>
              {isConnected && (
                <span className="h-2 w-2 rounded-full bg-emerald-300 animate-pulse" />
              )}
            </div>
            <p className="text-xs text-white/80 truncate">{phone}</p>
          </div>

          <div className="flex items-center gap-1">
            {slaMinutes !== null && slaMinutes > 0 && (
              <Badge variant="outline" className={cn("text-xs border", getSlaColor())}>
                <Clock className="h-3 w-3 mr-1" />
                {slaMinutes < 60 
                  ? `${slaMinutes}min`
                  : `${Math.floor(slaMinutes / 60)}h${slaMinutes % 60}m`
                }
              </Badge>
            )}
            
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-white hover:bg-white/20">
                    <Phone className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Ligar</TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-white hover:bg-white/20">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem>
                  <Search className="h-4 w-4 mr-2" />
                  Buscar mensagens
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-destructive">
                  Limpar conversa
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Connection Alert */}
        {!isLoadingInstance && !isConnected && (
          <Alert variant="destructive" className="mx-4 mt-3 rounded-lg">
            <WifiOff className="h-4 w-4" />
            <AlertDescription className="text-xs">
              WhatsApp não conectado. Vá em Configurações → Usuários para ativar.
            </AlertDescription>
          </Alert>
        )}

        {/* Messages Area */}
        <div 
          ref={scrollRef}
          className="flex-1 overflow-y-auto px-4 py-3 space-y-4"
          style={{ 
            backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%2310b981\' fill-opacity=\'0.03\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")',
          }}
        >
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
              <div className="h-20 w-20 rounded-full bg-emerald-500/10 flex items-center justify-center mb-4">
                <MessageSquare className="h-10 w-10 text-emerald-500" />
              </div>
              <p className="font-medium">Nenhuma mensagem ainda</p>
              <p className="text-sm mt-1">Envie a primeira mensagem para {leadName}</p>
            </div>
          ) : (
            Object.entries(groupedMessages).map(([date, msgs]) => (
              <div key={date} className="space-y-2">
                {/* Date separator */}
                <div className="flex justify-center">
                  <span className="text-xs text-muted-foreground bg-muted/80 backdrop-blur-sm px-3 py-1 rounded-full">
                    {formatMessageDate(new Date(date))}
                  </span>
                </div>
                
                {/* Messages */}
                {msgs.map((msg) => (
                  <div
                    key={msg.id}
                    className={cn(
                      "flex",
                      msg.direction === 'outgoing' ? 'justify-end' : 'justify-start'
                    )}
                  >
                    <div
                      className={cn(
                        "max-w-[75%] rounded-2xl px-4 py-2 shadow-sm",
                        msg.direction === 'outgoing'
                          ? 'bg-emerald-500 text-white rounded-br-md'
                          : 'bg-card border rounded-bl-md'
                      )}
                    >
                      <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>
                      <div className={cn(
                        "flex items-center justify-end gap-1 mt-1",
                        msg.direction === 'outgoing' 
                          ? 'text-white/70'
                          : 'text-muted-foreground'
                      )}>
                        <span className="text-[10px]">
                          {format(new Date(msg.created_at), 'HH:mm')}
                        </span>
                        {msg.direction === 'outgoing' && statusIcons[msg.status]}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ))
          )}
        </div>

        {/* Input Area */}
        <div className="px-4 py-3 border-t bg-background/80 backdrop-blur-sm">
          <div className="flex items-end gap-2">
            {/* Attachment buttons */}
            <div className="flex gap-1">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-9 w-9 text-muted-foreground hover:text-emerald-500"
                      onClick={() => handleFileSelect('image')}
                    >
                      <Image className="h-5 w-5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Enviar foto</TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-9 w-9 text-muted-foreground hover:text-emerald-500"
                      onClick={() => handleFileSelect('document')}
                    >
                      <Paperclip className="h-5 w-5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Enviar documento</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>

            {/* Message Input */}
            <div className="flex-1 relative">
              <Textarea
                placeholder="Digite sua mensagem..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                className="min-h-[44px] max-h-[120px] resize-none pr-10 rounded-2xl bg-muted/50 border-0 focus-visible:ring-1 focus-visible:ring-emerald-500"
                rows={1}
              />
              
              {/* Templates dropdown inside input */}
              {templates.length > 0 && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 text-muted-foreground hover:text-emerald-500"
                    >
                      <FileText className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-72">
                    <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
                      Templates rápidos
                    </div>
                    <DropdownMenuSeparator />
                    {templates.map((template) => (
                      <DropdownMenuItem
                        key={template.id}
                        onClick={() => applyTemplate(template.content)}
                        className="flex flex-col items-start py-2"
                      >
                        <span className="font-medium">{template.name}</span>
                        <span className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                          {template.content}
                        </span>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>

            {/* Audio / Send button */}
            {message.trim() ? (
              <Button
                size="icon"
                onClick={handleSend}
                disabled={sendMessage.isPending || !isConnected}
                className="h-10 w-10 rounded-full bg-emerald-500 hover:bg-emerald-600 shrink-0"
              >
                {sendMessage.isPending ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Send className="h-5 w-5" />
                )}
              </Button>
            ) : (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="icon"
                      variant={isRecording ? "destructive" : "default"}
                      onClick={handleAudioRecord}
                      disabled={!isConnected}
                      className={cn(
                        "h-10 w-10 rounded-full shrink-0",
                        !isRecording && "bg-emerald-500 hover:bg-emerald-600"
                      )}
                    >
                      <Mic className={cn("h-5 w-5", isRecording && "animate-pulse")} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    {isRecording ? 'Parar gravação' : 'Gravar áudio'}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
