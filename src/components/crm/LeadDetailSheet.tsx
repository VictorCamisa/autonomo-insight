import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { 
  Phone, Mail, Calendar, User, Car, MessageSquare, 
  Plus, Clock, MapPin, Tag, ExternalLink, TrendingUp,
  Brain, History, Handshake, Trash2, RotateCcw
} from 'lucide-react';
import type { Lead } from '@/types/crm';
import { leadStatusLabels, leadStatusColors, leadSourceLabels } from '@/types/crm';
import { useNegotiations } from '@/hooks/useNegotiations';
import { useClearLeadHistory, useDeleteLeadComplete } from '@/hooks/useLeads';
import { format, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useState } from 'react';
import { negotiationStatusLabels, negotiationStatusColors } from '@/types/negotiations';
import { WhatsAppChatModal } from '@/components/whatsapp/WhatsAppChatModal';
import { LeadQualificationPanel } from './LeadQualificationPanel';
import { LeadQualificationProgress } from './LeadQualificationProgress';
import { cn, parseDate } from '@/lib/utils';

interface LeadDetailSheetProps {
  lead: Lead | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStartNegotiation?: (leadId: string, salespersonId?: string) => void;
}

export function LeadDetailSheet({ lead, open, onOpenChange, onStartNegotiation }: LeadDetailSheetProps) {
  const { data: allNegotiations = [] } = useNegotiations();
  const [whatsappModalOpen, setWhatsappModalOpen] = useState(false);
  const clearHistory = useClearLeadHistory();
  const deleteLead = useDeleteLeadComplete();

  const leadNegotiations = allNegotiations.filter(n => n.lead_id === lead?.id);
  const activeNegotiations = leadNegotiations.filter(n => !['perdida', 'venda_concluida'].includes(n.status));

  if (!lead) return null;

  const createdAgo = formatDistanceToNow(new Date(lead.created_at), { addSuffix: true, locale: ptBR });
  const qualificationLabel = lead.qualification_status === 'qualificado' 
    ? 'Qualificado' 
    : lead.qualification_status === 'desqualificado' 
      ? 'Desqualificado' 
      : 'Em qualificação';
  const qualificationColor = lead.qualification_status === 'qualificado'
    ? 'bg-green-500'
    : lead.qualification_status === 'desqualificado'
      ? 'bg-red-500'
      : 'bg-amber-500';

  const handleClearHistory = () => {
    clearHistory.mutate(lead.id);
  };

  const handleDeleteLead = () => {
    deleteLead.mutate(lead.id, {
      onSuccess: () => {
        onOpenChange(false);
      }
    });
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl overflow-hidden flex flex-col p-0">
        {/* Header */}
        <SheetHeader className="px-6 py-5 border-b flex-shrink-0 bg-gradient-to-r from-muted/50 to-transparent">
          <div className="space-y-3">
            {/* Name */}
            <SheetTitle className="text-xl">{lead.name}</SheetTitle>
            
            {/* Status Badges */}
            <div className="flex flex-wrap items-center gap-2">
              <Badge className={leadStatusColors[lead.status]}>
                {leadStatusLabels[lead.status]}
              </Badge>
              <Badge className={qualificationColor}>
                {qualificationLabel}
              </Badge>
            </div>

            {/* Lead Info Grid */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              {/* Origem do Lead */}
              <div className="flex items-start gap-2 p-2.5 bg-muted/50 rounded-lg">
                <Tag className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">Origem</p>
                  <p className="text-sm font-medium truncate">{leadSourceLabels[lead.source]}</p>
                </div>
              </div>
              
              {/* Data de Criação */}
              <div className="flex items-start gap-2 p-2.5 bg-muted/50 rounded-lg">
                <Clock className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">Criado</p>
                  <p className="text-sm font-medium">{createdAgo}</p>
                </div>
              </div>
            </div>
          </div>
        </SheetHeader>

        {/* Quick Actions Bar */}
        <div className="px-6 py-3 border-b flex flex-wrap gap-2 flex-shrink-0 bg-muted/30">
          <Button
            size="sm"
            className="flex-1 bg-emerald-500 hover:bg-emerald-600"
            onClick={() => setWhatsappModalOpen(true)}
          >
            <MessageSquare className="h-4 w-4 mr-2" />
            WhatsApp
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="flex-1"
            onClick={() => window.open(`tel:${lead.phone}`, '_self')}
          >
            <Phone className="h-4 w-4 mr-2" />
            Ligar
          </Button>
          {activeNegotiations.length === 0 && (
            <Button
              size="sm"
              variant="default"
              className="flex-1"
              onClick={() => onStartNegotiation?.(lead.id, lead.assigned_to || undefined)}
            >
              <Plus className="h-4 w-4 mr-2" />
              Negociar
            </Button>
          )}
        </div>

        {/* Testing Actions - Clear History / Delete Lead */}
        <div className="px-6 py-2 border-b flex gap-2 flex-shrink-0 bg-destructive/5">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                size="sm"
                variant="outline"
                className="flex-1 text-amber-600 border-amber-300 hover:bg-amber-50"
                disabled={clearHistory.isPending}
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                {clearHistory.isPending ? 'Limpando...' : 'Limpar Histórico'}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Limpar histórico de conversa?</AlertDialogTitle>
                <AlertDialogDescription>
                  Isso apagará todas as mensagens da IA, qualificação e resetará o lead para testar novamente do zero.
                  O lead em si será mantido.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={handleClearHistory} className="bg-amber-600 hover:bg-amber-700">
                  Limpar Histórico
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                size="sm"
                variant="outline"
                className="flex-1 text-destructive border-destructive/30 hover:bg-destructive/10"
                disabled={deleteLead.isPending}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                {deleteLead.isPending ? 'Excluindo...' : 'Excluir Lead'}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Excluir lead completamente?</AlertDialogTitle>
                <AlertDialogDescription>
                  Isso apagará permanentemente o lead, todas as negociações, mensagens e histórico.
                  Esta ação não pode ser desfeita.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteLead} className="bg-destructive hover:bg-destructive/90">
                  Excluir Permanentemente
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>

        {/* WhatsApp Modal */}
        <WhatsAppChatModal
          open={whatsappModalOpen}
          onOpenChange={setWhatsappModalOpen}
          leadId={lead.id}
          phone={lead.phone}
          leadName={lead.name}
        />

        {/* Tabs */}
        <Tabs defaultValue="qualification" className="flex-1 overflow-hidden flex flex-col min-h-0">
          <TabsList className="grid w-full grid-cols-3 mx-6 mt-4 flex-shrink-0" style={{ width: 'calc(100% - 3rem)' }}>
            <TabsTrigger value="qualification" className="text-xs sm:text-sm gap-1">
              <Brain className="h-3 w-3" />
              Qualificação
            </TabsTrigger>
            <TabsTrigger value="info" className="text-xs sm:text-sm gap-1">
              <User className="h-3 w-3" />
              Dados
            </TabsTrigger>
            <TabsTrigger value="negotiations" className="text-xs sm:text-sm gap-1">
              <Handshake className="h-3 w-3" />
              Negociações
              {leadNegotiations.length > 0 && (
                <Badge variant="secondary" className="ml-1 h-4 w-4 p-0 text-[10px] flex items-center justify-center">
                  {leadNegotiations.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          {/* Qualification Tab - Real-time AI Panel */}
          <TabsContent value="qualification" className="flex-1 overflow-hidden mt-4 m-0 data-[state=active]:flex data-[state=active]:flex-col min-h-0">
            <ScrollArea className="flex-1 min-h-0 px-6 pb-6">
              <div className="space-y-4">
                {/* Dynamic Qualification Progress based on current level */}
                <LeadQualificationProgress lead={lead} />
                
                {/* AI Conversation Panel */}
                <LeadQualificationPanel leadId={lead.id} />
              </div>
            </ScrollArea>
          </TabsContent>

          {/* Info Tab */}
          <TabsContent value="info" className="flex-1 overflow-hidden mt-4 m-0 data-[state=active]:flex data-[state=active]:flex-col min-h-0">
            <ScrollArea className="flex-1 min-h-0 px-6 pb-6">
              <div className="space-y-4">
                {/* Contact Info */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      Contato
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <a 
                      href={`tel:${lead.phone}`} 
                      className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted transition-colors"
                    >
                      <Phone className="h-4 w-4 text-emerald-500" />
                      <span className="font-mono">{lead.phone}</span>
                      <ExternalLink className="h-3 w-3 ml-auto text-muted-foreground" />
                    </a>
                    {lead.email && (
                      <a 
                        href={`mailto:${lead.email}`} 
                        className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted transition-colors"
                      >
                        <Mail className="h-4 w-4 text-blue-500" />
                        <span className="truncate">{lead.email}</span>
                        <ExternalLink className="h-3 w-3 ml-auto text-muted-foreground" />
                      </a>
                    )}
                  </CardContent>
                </Card>

                {/* Vehicle Interest */}
                {lead.vehicle_interest && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <Car className="h-4 w-4 text-muted-foreground" />
                        Interesse em Veículo
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-2 p-3 bg-primary/10 rounded-lg">
                        <Car className="h-5 w-5 text-primary" />
                        <span className="font-medium">{lead.vehicle_interest}</span>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Assigned Salesperson */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      Vendedor Responsável
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <User className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">
                          {lead.assigned_profile?.full_name || 'Não atribuído'}
                        </p>
                        {lead.qualification_status === 'qualificado' ? (
                          <p className="text-xs text-green-600">Lead transferido</p>
                        ) : (
                          <p className="text-xs text-muted-foreground">Pré-atribuído (Round-Robin)</p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* UTM / Source Info */}
                {(lead.utm_source || lead.utm_campaign || lead.utm_medium) && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                        Origem do Lead
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        {lead.utm_source && (
                          <div className="p-2 bg-muted rounded">
                            <span className="text-muted-foreground">Source:</span>{' '}
                            <span className="font-medium">{lead.utm_source}</span>
                          </div>
                        )}
                        {lead.utm_medium && (
                          <div className="p-2 bg-muted rounded">
                            <span className="text-muted-foreground">Medium:</span>{' '}
                            <span className="font-medium">{lead.utm_medium}</span>
                          </div>
                        )}
                        {lead.utm_campaign && (
                          <div className="p-2 bg-muted rounded col-span-2">
                            <span className="text-muted-foreground">Campaign:</span>{' '}
                            <span className="font-medium">{lead.utm_campaign}</span>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Notes */}
                {lead.notes && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium">Observações</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">{lead.notes}</p>
                    </CardContent>
                  </Card>
                )}

                {/* Timestamps */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <History className="h-4 w-4 text-muted-foreground" />
                      Timeline
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Criado em</span>
                      <span>{(() => { const d = parseDate(lead.created_at); return d ? format(d, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR }) : '-'; })()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Atualizado em</span>
                      <span>{(() => { const d = parseDate(lead.updated_at); return d ? format(d, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR }) : '-'; })()}</span>
                    </div>
                    {lead.first_response_at && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Primeira resposta</span>
                        <span>{(() => { const d = parseDate(lead.first_response_at); return d ? format(d, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR }) : '-'; })()}</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </ScrollArea>
          </TabsContent>

          {/* Negotiations Tab */}
          <TabsContent value="negotiations" className="flex-1 overflow-hidden mt-4 m-0 data-[state=active]:flex data-[state=active]:flex-col min-h-0">
            <ScrollArea className="flex-1 min-h-0 px-6 pb-6">
              <div className="space-y-3">
                {leadNegotiations.length === 0 ? (
                  <div className="text-center py-12">
                    <Handshake className="h-12 w-12 mx-auto mb-4 text-muted-foreground/30" />
                    <p className="text-muted-foreground mb-4">Nenhuma negociação iniciada</p>
                    <Button
                      onClick={() => onStartNegotiation?.(lead.id, lead.assigned_to || undefined)}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Iniciar Negociação
                    </Button>
                  </div>
                ) : (
                  <>
                    {/* Active Negotiations First */}
                    {activeNegotiations.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                          Ativas ({activeNegotiations.length})
                        </p>
                        {activeNegotiations.map((negotiation) => (
                          <NegotiationCard key={negotiation.id} negotiation={negotiation} />
                        ))}
                      </div>
                    )}

                    {/* Closed Negotiations */}
                    {leadNegotiations.filter(n => ['perdida', 'venda_concluida'].includes(n.status)).length > 0 && (
                      <div className="space-y-2 mt-4">
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                          Encerradas
                        </p>
                        {leadNegotiations
                          .filter(n => ['perdida', 'venda_concluida'].includes(n.status))
                          .map((negotiation) => (
                            <NegotiationCard key={negotiation.id} negotiation={negotiation} />
                          ))}
                      </div>
                    )}

                    {/* Start New */}
                    <Button
                      variant="outline"
                      className="w-full mt-4"
                      onClick={() => onStartNegotiation?.(lead.id, lead.assigned_to || undefined)}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Nova Negociação
                    </Button>
                  </>
                )}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}

function NegotiationCard({ negotiation }: { negotiation: any }) {
  const isWon = negotiation.status === 'venda_concluida';
  const isLost = negotiation.status === 'perdida';

  return (
    <Card className={cn(
      "transition-colors",
      isWon && "border-green-500/30 bg-green-500/5",
      isLost && "border-destructive/30 bg-destructive/5"
    )}>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <Badge className={negotiationStatusColors[negotiation.status]}>
            {negotiationStatusLabels[negotiation.status]}
          </Badge>
          {negotiation.estimated_value && (
            <span className="font-semibold">
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(negotiation.estimated_value)}
            </span>
          )}
        </div>
        
        {negotiation.vehicle && (
          <div className="flex items-center gap-2 text-sm">
            <Car className="h-4 w-4 text-muted-foreground" />
            <span>{negotiation.vehicle.brand} {negotiation.vehicle.model} {negotiation.vehicle.year}</span>
          </div>
        )}

        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Calendar className="h-3 w-3" />
          <span>
            {format(new Date(negotiation.created_at), "dd/MM/yyyy", { locale: ptBR })}
          </span>
        </div>

        {negotiation.loss_reason && (
          <p className="text-xs bg-destructive/10 text-destructive rounded-lg p-2">
            Motivo: {negotiation.loss_reason}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
