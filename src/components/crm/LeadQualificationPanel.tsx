import { useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Bot, User, Car, DollarSign, CreditCard, RefreshCw, 
  CheckCircle2, Circle, Clock, Brain, Sparkles, MessageCircle
} from 'lucide-react';
import { 
  useLeadQualification, 
  useLeadAIConversation, 
  useAIConversationMessages,
  calculateQualificationProgress 
} from '@/hooks/useLeadQualification';
import { format, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface LeadQualificationPanelProps {
  leadId: string;
}

export function LeadQualificationPanel({ leadId }: LeadQualificationPanelProps) {
  const { data: qualification, isLoading: loadingQual } = useLeadQualification(leadId);
  const { data: conversation } = useLeadAIConversation(leadId);
  const { data: messages = [], isLoading: loadingMessages } = useAIConversationMessages(conversation?.id);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const progress = calculateQualificationProgress(qualification);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const formatCurrency = (value: number | null) => {
    if (value === null) return null;
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  return (
    <div className="space-y-4">
      {/* Qualification Progress Card */}
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Brain className="h-4 w-4 text-primary" />
            Qualificação pela IA
            {qualification?.is_qualified && (
              <Badge className="bg-green-500 ml-auto">Qualificado</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {loadingQual ? (
            <Skeleton className="h-20 w-full" />
          ) : (
            <>
              {/* Progress Bar */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Progresso da qualificação</span>
                  <span className="font-medium text-foreground">{progress.percentage}%</span>
                </div>
                <Progress value={progress.percentage} className="h-2" />
              </div>

              {/* Message Count */}
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <MessageCircle className="h-3 w-3" />
                <span>{qualification?.message_count || 0} mensagens trocadas</span>
              </div>

              {/* Collected Data Grid */}
              <div className="grid grid-cols-2 gap-2">
                <QualificationItem
                  icon={Car}
                  label="Veículo"
                  value={qualification?.vehicle_interest}
                  collected={!!qualification?.vehicle_interest}
                />
                <QualificationItem
                  icon={DollarSign}
                  label="Orçamento"
                  value={formatCurrency(qualification?.budget ?? null)}
                  collected={qualification?.budget !== null && qualification?.budget !== undefined}
                />
                <QualificationItem
                  icon={CreditCard}
                  label="Entrada"
                  value={formatCurrency(qualification?.down_payment ?? null)}
                  collected={qualification?.down_payment !== null && qualification?.down_payment !== undefined}
                />
                <QualificationItem
                  icon={CreditCard}
                  label="Parcela"
                  value={formatCurrency(qualification?.desired_installment ?? null)}
                  collected={qualification?.desired_installment !== null && qualification?.desired_installment !== undefined}
                />
                <QualificationItem
                  icon={RefreshCw}
                  label="Troca"
                  value={qualification?.has_trade_in === true 
                    ? (qualification?.trade_in_vehicle || 'Sim') 
                    : qualification?.has_trade_in === false 
                      ? 'Não' 
                      : null}
                  collected={qualification?.has_trade_in !== null && qualification?.has_trade_in !== undefined}
                />
                <QualificationItem
                  icon={CheckCircle2}
                  label="Nome Limpo"
                  value={qualification?.clean_credit === true 
                    ? 'Sim' 
                    : qualification?.clean_credit === false 
                      ? 'Não' 
                      : null}
                  collected={qualification?.clean_credit !== null && qualification?.clean_credit !== undefined}
                />
              </div>

              {/* Missing Fields Warning */}
              {progress.missingFields.length > 0 && progress.percentage < 100 && (
                <div className="text-xs text-muted-foreground bg-muted/50 rounded-lg p-2">
                  <span className="font-medium">Faltando:</span>{' '}
                  {progress.missingFields.slice(0, 3).join(', ')}
                  {progress.missingFields.length > 3 && ` +${progress.missingFields.length - 3}`}
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* AI Conversation Card */}
      <Card className="flex-1 flex flex-col min-h-0">
        <CardHeader className="pb-2 flex-shrink-0">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-amber-500" />
            Conversa com a IA Gabi
            {conversation?.status === 'active' && (
              <Badge variant="outline" className="text-emerald-500 border-emerald-500 ml-auto text-xs">
                <span className="animate-pulse mr-1">●</span> Ao vivo
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 p-0 min-h-0">
          {loadingMessages ? (
            <div className="p-4 space-y-3">
              <Skeleton className="h-12 w-3/4" />
              <Skeleton className="h-12 w-2/3 ml-auto" />
              <Skeleton className="h-12 w-3/4" />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
              <Bot className="h-8 w-8 mb-2 opacity-50" />
              <p className="text-sm">Nenhuma conversa com IA ainda</p>
            </div>
          ) : (
            <ScrollArea className="h-[280px]">
              <div className="p-4 space-y-3">
                {messages.map((msg, idx) => (
                  <MessageBubble key={msg.id} message={msg} isLast={idx === messages.length - 1} />
                ))}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function QualificationItem({ 
  icon: Icon, 
  label, 
  value, 
  collected 
}: { 
  icon: React.ComponentType<{ className?: string }>; 
  label: string; 
  value: string | null; 
  collected: boolean;
}) {
  return (
    <div className={cn(
      "flex items-start gap-2 p-2 rounded-lg text-xs transition-colors",
      collected ? "bg-green-500/10" : "bg-muted/30"
    )}>
      <div className={cn(
        "p-1 rounded",
        collected ? "bg-green-500/20 text-green-600" : "bg-muted text-muted-foreground"
      )}>
        {collected ? (
          <CheckCircle2 className="h-3 w-3" />
        ) : (
          <Circle className="h-3 w-3" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-muted-foreground">{label}</p>
        {collected ? (
          <p className="font-medium truncate">{value}</p>
        ) : (
          <p className="text-muted-foreground/50 italic">Pendente</p>
        )}
      </div>
    </div>
  );
}

function MessageBubble({ message, isLast }: { message: { role: string; content: string | null; created_at: string }; isLast: boolean }) {
  const isBot = message.role === 'assistant';
  const timeAgo = formatDistanceToNow(new Date(message.created_at), { addSuffix: true, locale: ptBR });
  
  return (
    <div className={cn("flex gap-2", isBot ? "flex-row" : "flex-row-reverse")}>
      <div className={cn(
        "w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0",
        isBot ? "bg-primary text-primary-foreground" : "bg-muted"
      )}>
        {isBot ? <Bot className="h-3 w-3" /> : <User className="h-3 w-3" />}
      </div>
      <div className={cn(
        "max-w-[80%] rounded-lg px-3 py-2 text-sm",
        isBot ? "bg-muted" : "bg-primary text-primary-foreground"
      )}>
        <p className="whitespace-pre-wrap break-words">{message.content || '...'}</p>
        <p className={cn(
          "text-[10px] mt-1",
          isBot ? "text-muted-foreground" : "text-primary-foreground/70"
        )}>
          {timeAgo}
          {isLast && isBot && (
            <span className="ml-1 animate-pulse">●</span>
          )}
        </p>
      </div>
    </div>
  );
}
