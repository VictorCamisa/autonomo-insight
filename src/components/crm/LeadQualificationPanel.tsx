import { useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { 
  Bot, User, Car, DollarSign, CreditCard, RefreshCw, 
  CheckCircle2, Circle, MessageCircle, Brain, Sparkles,
  FileText, UserCheck
} from 'lucide-react';
import { 
  useLeadQualification, 
  useLeadAIConversation, 
  useAIConversationMessages,
  calculateQualificationProgress 
} from '@/hooks/useLeadQualification';
import { formatDistanceToNow } from 'date-fns';
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
    <div className="flex flex-col gap-6">
      {/* Qualification Status Card */}
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 via-transparent to-transparent shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Brain className="h-5 w-5 text-primary" />
              Qualificação pela IA
            </CardTitle>
            {qualification?.is_qualified && (
              <Badge className="bg-green-500 text-white">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Qualificado
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          {loadingQual ? (
            <div className="space-y-3">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-20 w-full" />
            </div>
          ) : (
            <>
              {/* Progress Section */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Progresso</span>
                  <span className="text-lg font-bold text-primary">{progress.percentage}%</span>
                </div>
                <Progress value={progress.percentage} className="h-3" />
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <MessageCircle className="h-3.5 w-3.5" />
                  <span>{qualification?.message_count || 0} mensagens trocadas</span>
                </div>
              </div>

              <Separator />

              {/* Collected Data - Vertical List */}
              <div className="space-y-3">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                  <FileText className="h-3.5 w-3.5" />
                  Dados Coletados
                </p>
                
                <div className="space-y-2">
                  <QualificationItem
                    icon={Car}
                    label="Veículo de Interesse"
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
                    label="Valor da Entrada"
                    value={formatCurrency(qualification?.down_payment ?? null)}
                    collected={qualification?.down_payment !== null && qualification?.down_payment !== undefined}
                  />
                  <QualificationItem
                    icon={CreditCard}
                    label="Parcela Desejada"
                    value={formatCurrency(qualification?.desired_installment ?? null)}
                    collected={qualification?.desired_installment !== null && qualification?.desired_installment !== undefined}
                  />
                  <QualificationItem
                    icon={RefreshCw}
                    label="Veículo para Troca"
                    value={qualification?.has_trade_in === true 
                      ? (qualification?.trade_in_vehicle || 'Sim, possui') 
                      : qualification?.has_trade_in === false 
                        ? 'Não possui' 
                        : null}
                    collected={qualification?.has_trade_in !== null && qualification?.has_trade_in !== undefined}
                  />
                  <QualificationItem
                    icon={UserCheck}
                    label="Nome Limpo (SPC/Serasa)"
                    value={qualification?.clean_credit === true 
                      ? 'Sim, nome limpo' 
                      : qualification?.clean_credit === false 
                        ? 'Não, possui restrição' 
                        : null}
                    collected={qualification?.clean_credit !== null && qualification?.clean_credit !== undefined}
                  />
                </div>
              </div>

              {/* Missing Fields */}
              {progress.missingFields.length > 0 && progress.percentage < 100 && (
                <>
                  <Separator />
                  <div className="text-xs text-amber-600 bg-amber-50 dark:bg-amber-950/30 rounded-lg p-3 space-y-1">
                    <p className="font-medium">⏳ Ainda falta coletar:</p>
                    <p className="text-amber-700 dark:text-amber-400">
                      {progress.missingFields.join(' • ')}
                    </p>
                  </div>
                </>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* AI Conversation Card - Bigger Chat */}
      <Card className="border shadow-sm">
        <CardHeader className="pb-3 border-b">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-amber-500" />
              Conversa com a Gabi (IA)
            </CardTitle>
            {conversation?.status === 'active' && (
              <Badge variant="outline" className="text-emerald-500 border-emerald-500 text-xs">
                <span className="animate-pulse mr-1.5">●</span> Ao vivo
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loadingMessages ? (
            <div className="p-5 space-y-4">
              <Skeleton className="h-14 w-3/4" />
              <Skeleton className="h-14 w-2/3 ml-auto" />
              <Skeleton className="h-14 w-3/4" />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <Bot className="h-12 w-12 mb-3 opacity-30" />
              <p className="text-sm font-medium">Nenhuma conversa com IA ainda</p>
              <p className="text-xs mt-1">A IA Gabi ainda não interagiu com este lead</p>
            </div>
          ) : (
            <ScrollArea className="h-[400px]">
              <div className="p-5 space-y-4">
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
      "flex items-center gap-3 p-3 rounded-lg transition-all",
      collected 
        ? "bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800" 
        : "bg-muted/50 border border-transparent"
    )}>
      <div className={cn(
        "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0",
        collected 
          ? "bg-green-500 text-white" 
          : "bg-muted-foreground/20 text-muted-foreground"
      )}>
        {collected ? (
          <CheckCircle2 className="h-4 w-4" />
        ) : (
          <Circle className="h-4 w-4" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className={cn(
          "text-sm",
          collected ? "text-muted-foreground" : "text-muted-foreground/70"
        )}>
          {label}
        </p>
        {collected ? (
          <p className="font-semibold text-foreground truncate">{value}</p>
        ) : (
          <p className="text-muted-foreground/50 italic text-sm">Aguardando resposta...</p>
        )}
      </div>
    </div>
  );
}

function MessageBubble({ message, isLast }: { message: { role: string; content: string | null; created_at: string }; isLast: boolean }) {
  const isBot = message.role === 'assistant';
  const timeAgo = formatDistanceToNow(new Date(message.created_at), { addSuffix: true, locale: ptBR });
  
  return (
    <div className={cn("flex gap-3", isBot ? "flex-row" : "flex-row-reverse")}>
      <div className={cn(
        "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0",
        isBot ? "bg-primary text-primary-foreground" : "bg-muted"
      )}>
        {isBot ? <Bot className="h-4 w-4" /> : <User className="h-4 w-4" />}
      </div>
      <div className={cn(
        "max-w-[75%] rounded-2xl px-4 py-3",
        isBot 
          ? "bg-muted rounded-tl-sm" 
          : "bg-primary text-primary-foreground rounded-tr-sm"
      )}>
        <p className="text-sm whitespace-pre-wrap break-words leading-relaxed">
          {message.content || '...'}
        </p>
        <p className={cn(
          "text-[11px] mt-2 flex items-center gap-1",
          isBot ? "text-muted-foreground" : "text-primary-foreground/70"
        )}>
          {timeAgo}
          {isLast && isBot && (
            <span className="ml-1 animate-pulse text-emerald-500">● typing...</span>
          )}
        </p>
      </div>
    </div>
  );
}
