import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Car, Phone, Calendar, TrendingUp, User, UserCircle, Clock, Zap } from 'lucide-react';
import type { Negotiation } from '@/types/negotiations';
import { negotiationStatusLabels, negotiationStatusColors } from '@/types/negotiations';
import { format, differenceInHours } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface NegotiationCardProps {
  negotiation: Negotiation;
  onClick?: () => void;
  showSalesperson?: boolean;
}

// Determina o tipo de follow-up baseado no tempo no estágio
function getFollowUpType(negotiation: Negotiation): { type: 'inicial' | 'programado'; hoursInStage: number } | null {
  if (negotiation.status !== 'follow_up') return null;
  
  // Usa updated_at como referência de quando entrou no estágio
  const enteredAt = new Date(negotiation.updated_at);
  const now = new Date();
  const hoursInStage = differenceInHours(now, enteredAt);
  
  return {
    type: hoursInStage < 24 ? 'inicial' : 'programado',
    hoursInStage,
  };
}

export function NegotiationCard({ negotiation, onClick, showSalesperson }: NegotiationCardProps) {
  const formatCurrency = (value: number | null) => {
    if (!value) return '-';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const followUpInfo = getFollowUpType(negotiation);

  return (
    <Card 
      className="cursor-pointer hover:shadow-md transition-shadow border-border/50 bg-card"
      onClick={onClick}
    >
      <CardContent className="p-3 space-y-2">
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
          
          {/* Badge de status com indicador de Follow-up */}
          <div className="flex flex-col items-end gap-1 shrink-0">
            <Badge variant="outline" className="text-xs">
              {negotiationStatusLabels[negotiation.status]}
            </Badge>
            
            {followUpInfo && (
              <Badge 
                variant="secondary" 
                className={`text-[10px] px-1.5 py-0 ${
                  followUpInfo.type === 'inicial' 
                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300' 
                    : 'bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300'
                }`}
              >
                {followUpInfo.type === 'inicial' ? (
                  <>
                    <Zap className="h-2.5 w-2.5 mr-0.5" />
                    Inicial
                  </>
                ) : (
                  <>
                    <Clock className="h-2.5 w-2.5 mr-0.5" />
                    Programado
                  </>
                )}
              </Badge>
            )}
          </div>
        </div>

        {/* Indicador de tempo em follow-up */}
        {followUpInfo && (
          <div className={`text-[10px] px-2 py-1 rounded-md flex items-center gap-1 ${
            followUpInfo.type === 'inicial'
              ? 'bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400'
              : 'bg-orange-50 text-orange-600 dark:bg-orange-950/50 dark:text-orange-400'
          }`}>
            <Clock className="h-3 w-3" />
            <span>
              {followUpInfo.hoursInStage < 1 
                ? 'Há menos de 1h no follow-up'
                : followUpInfo.hoursInStage < 24 
                  ? `Há ${followUpInfo.hoursInStage}h no follow-up`
                  : `Há ${Math.floor(followUpInfo.hoursInStage / 24)}d no follow-up`
              }
            </span>
          </div>
        )}

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

        {negotiation.expected_close_date && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Calendar className="h-3 w-3" />
            <span>Previsão: {format(new Date(negotiation.expected_close_date), 'dd/MM/yyyy', { locale: ptBR })}</span>
          </div>
        )}

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

// Exporta a função para uso em outros componentes
export { getFollowUpType };
