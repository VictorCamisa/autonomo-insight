import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Car, Phone, Calendar, TrendingUp, User, UserCircle, Clock, Zap, Globe, MessageSquare, CalendarPlus } from 'lucide-react';
import type { Negotiation } from '@/types/negotiations';
import { negotiationStatusLabels, negotiationStatusColors } from '@/types/negotiations';
import { format, differenceInHours, differenceInMinutes, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { parseDate } from '@/lib/utils';

const leadSourceLabels: Record<string, string> = {
  website: 'Site',
  whatsapp: 'WhatsApp',
  indicacao: 'Indicação',
  facebook: 'Facebook',
  instagram: 'Instagram',
  google_ads: 'Google Ads',
  olx: 'OLX',
  webmotors: 'Webmotors',
  outros: 'Outros',
};

function formatTimeAgo(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const mins = differenceInMinutes(now, date);
  if (mins < 60) return `${mins}min`;
  const hrs = differenceInHours(now, date);
  if (hrs < 24) return `${hrs}h`;
  const days = differenceInDays(now, date);
  if (days < 30) return `${days}d`;
  return `${Math.floor(days / 30)}m`;
}

interface NegotiationCardProps {
  negotiation: Negotiation;
  onClick?: () => void;
  showSalesperson?: boolean;
}


export function NegotiationCard({ negotiation, onClick, showSalesperson }: NegotiationCardProps) {
  const formatCurrency = (value: number | null) => {
    if (!value) return '-';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  

  const createdDate = new Date(negotiation.created_at);
  const timeInStage = formatTimeAgo(negotiation.updated_at);
  const leadSource = negotiation.lead?.source ? (leadSourceLabels[negotiation.lead.source] || negotiation.lead.source) : null;

  // Destaque para leads sem resposta há mais de 24h (follow-up necessário)
  const isActiveStage = negotiation.status === 'negociando' || negotiation.status === 'follow_up' || negotiation.status === 'atendimento_ia';
  const lastActivity = negotiation.last_message_at || negotiation.updated_at;
  const hoursSinceLastMessage = lastActivity ? differenceInHours(new Date(), new Date(lastActivity)) : 0;
  const needsFollowUp = isActiveStage && hoursSinceLastMessage >= 24;

  return (
    <Card 
      className={`cursor-pointer hover:shadow-md transition-shadow bg-card ${
        needsFollowUp 
          ? 'border-orange-400 dark:border-orange-600 border-l-4 ring-1 ring-orange-200 dark:ring-orange-900/50' 
          : 'border-border/50'
      }`}
      onClick={onClick}
    >
      <CardContent className="p-3 space-y-1.5">
        {/* Follow-up alert badge */}
        {needsFollowUp && (
          <div className="flex items-center gap-1 text-xs text-orange-700 dark:text-orange-400 bg-orange-100 dark:bg-orange-950/40 rounded px-2 py-1 font-medium">
            <Clock className="h-3 w-3" />
            <span>Follow-up: sem resposta há {hoursSinceLastMessage >= 24 ? `${Math.floor(hoursSinceLastMessage / 24)}d` : `${hoursSinceLastMessage}h`}</span>
          </div>
        )}

        {/* Header: Name + Status */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <h4 className="font-medium text-sm truncate text-foreground">
              {negotiation.lead?.name || 'Lead não encontrado'}
            </h4>
            {negotiation.lead?.phone && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Phone className="h-3 w-3" />
                <span>{negotiation.lead.phone}</span>
              </div>
            )}
          </div>
          
          <div className="flex flex-col items-end gap-1 shrink-0">
            <Badge variant="outline" className="text-xs">
              {negotiationStatusLabels[negotiation.status]}
            </Badge>
          </div>
        </div>

        {negotiation.customer && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground bg-muted/50 rounded px-2 py-1">
            <UserCircle className="h-3 w-3" />
            <span className="truncate">Cliente: {negotiation.customer.name}</span>
          </div>
        )}

        {negotiation.vehicle && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground bg-muted/50 rounded px-2 py-1">
            <Car className="h-3 w-3" />
            <span className="truncate">
              {negotiation.vehicle.brand} {negotiation.vehicle.model} {negotiation.vehicle.year_model}
            </span>
          </div>
        )}

        <div className="flex items-center justify-between text-xs">
          {negotiation.estimated_value ? (
            <span className="font-semibold text-foreground">
              {formatCurrency(negotiation.estimated_value)}
            </span>
          ) : (
            <span className="text-muted-foreground">Valor não definido</span>
          )}
          
          {negotiation.probability !== null && (
            <div className="flex items-center gap-1 text-muted-foreground">
              <TrendingUp className="h-3 w-3" />
              <span>{negotiation.probability}%</span>
            </div>
          )}
        </div>

        {/* Last message + Expected close */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[10px] text-muted-foreground">
          {negotiation.last_message_at && (
            <div className="flex items-center gap-0.5" title="Última mensagem">
              <MessageSquare className="h-2.5 w-2.5" />
              <span>Últ. msg: {formatTimeAgo(negotiation.last_message_at)} atrás</span>
            </div>
          )}
          {negotiation.expected_close_date && (
            <div className="flex items-center gap-0.5">
              <Calendar className="h-2.5 w-2.5" />
              <span>Prev: {(() => {
                const date = parseDate(negotiation.expected_close_date);
                return date ? format(date, 'dd/MM/yyyy', { locale: ptBR }) : '-';
              })()}</span>
            </div>
          )}
        </div>

        {showSalesperson && negotiation.salesperson?.full_name && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground pt-1 border-t border-border/50">
            <User className="h-3 w-3" />
            <span>{negotiation.salesperson.full_name}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
