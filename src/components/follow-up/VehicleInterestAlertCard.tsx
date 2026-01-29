import { format, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  User, 
  Phone, 
  Car, 
  Calendar, 
  MessageCircle, 
  BellOff, 
  Check, 
  Trash2,
  Clock,
  Search,
  AlertCircle,
  DollarSign,
  Tag,
  ExternalLink,
  Copy,
  Sparkles
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { VehicleInterestAlert } from '@/hooks/useVehicleInterestAlerts';
import { toast } from 'sonner';

interface VehicleInterestAlertCardProps {
  alert: VehicleInterestAlert;
  onViewVehicles: (alert: VehicleInterestAlert) => void;
  onOpenWhatsApp: (phone: string) => void;
  onExpire: (alert: VehicleInterestAlert) => void;
  onConvert: (alert: VehicleInterestAlert) => void;
  onDelete: (alert: VehicleInterestAlert) => void;
}

const alertStatusConfig: Record<string, { label: string; color: string; icon: React.ReactNode; description: string }> = {
  active: { 
    label: 'Ativo', 
    color: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
    icon: <Sparkles className="h-3 w-3" />,
    description: 'Aguardando veículo compatível entrar no estoque'
  },
  notified: { 
    label: 'Notificado', 
    color: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
    icon: <MessageCircle className="h-3 w-3" />,
    description: 'Cliente foi notificado sobre um veículo compatível'
  },
  expired: { 
    label: 'Expirado', 
    color: 'bg-gray-500/10 text-gray-500 border-gray-500/20',
    icon: <BellOff className="h-3 w-3" />,
    description: 'Alerta expirado manualmente ou por tempo'
  },
  converted: { 
    label: 'Convertido', 
    color: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
    icon: <Check className="h-3 w-3" />,
    description: 'Cliente realizou a compra!'
  },
};

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
};

export function VehicleInterestAlertCard({
  alert,
  onViewVehicles,
  onOpenWhatsApp,
  onExpire,
  onConvert,
  onDelete,
}: VehicleInterestAlertCardProps) {
  const statusConfig = alertStatusConfig[alert.status] || alertStatusConfig.active;
  const createdDate = new Date(alert.created_at);
  const timeAgo = formatDistanceToNow(createdDate, { addSuffix: true, locale: ptBR });
  
  const hasVehiclePreference = alert.vehicle_brand || alert.vehicle_model;
  const hasPriceRange = alert.price_min || alert.price_max;
  const hasYearRange = alert.year_min || alert.year_max;

  const handleCopyPhone = () => {
    navigator.clipboard.writeText(alert.customer_phone);
    toast.success('Telefone copiado!');
  };

  const vehicleDescription = [
    alert.vehicle_brand,
    alert.vehicle_model,
  ].filter(Boolean).join(' ') || 'Qualquer veículo';

  return (
    <Card className="hover:shadow-lg transition-all duration-200 border-l-4" style={{ borderLeftColor: alert.status === 'active' ? 'hsl(var(--primary))' : 'transparent' }}>
      <CardHeader className="pb-2 pt-4 px-4">
        <div className="flex items-start justify-between gap-3">
          {/* Header: Status + Title */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge variant="outline" className={`${statusConfig.color} gap-1 cursor-help`}>
                      {statusConfig.icon}
                      {statusConfig.label}
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="max-w-xs">{statusConfig.description}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {timeAgo}
              </span>
            </div>
            
            {/* Vehicle Interest - Main Title */}
            <div className="flex items-center gap-2 mt-2">
              <div className="p-1.5 rounded-md bg-primary/10">
                <Car className="h-4 w-4 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-base leading-tight">
                  {vehicleDescription}
                </h3>
                {hasYearRange && (
                  <span className="text-xs text-muted-foreground">
                    Ano: {alert.year_min || 'qualquer'} - {alert.year_max || 'qualquer'}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Quick Delete */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  size="icon" 
                  variant="ghost"
                  className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                  onClick={() => onDelete(alert)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Excluir alerta</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </CardHeader>

      <CardContent className="px-4 pb-4 pt-0">
        {/* Customer Info Section */}
        <div className="bg-muted/40 rounded-lg p-3 mb-3">
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Cliente interessado
            </span>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <User className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{alert.customer_name}</p>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Phone className="h-3 w-3" />
                <span className="truncate">{alert.customer_phone}</span>
                <Button 
                  size="icon" 
                  variant="ghost" 
                  className="h-5 w-5 p-0"
                  onClick={handleCopyPhone}
                >
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Preferences Summary */}
        <div className="flex flex-wrap gap-2 mb-3">
          {hasPriceRange && (
            <Badge variant="secondary" className="gap-1 text-xs">
              <DollarSign className="h-3 w-3" />
              {alert.price_min && alert.price_max 
                ? `${formatCurrency(alert.price_min)} - ${formatCurrency(alert.price_max)}`
                : alert.price_max 
                  ? `Até ${formatCurrency(alert.price_max)}`
                  : `A partir de ${formatCurrency(alert.price_min!)}`
              }
            </Badge>
          )}
          
          {alert.notes && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge variant="outline" className="gap-1 text-xs cursor-help">
                    <Tag className="h-3 w-3" />
                    Obs
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="max-w-xs">{alert.notes}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>

        {/* Date Info */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
          <Calendar className="h-3 w-3" />
          <span>Cadastrado em {format(createdDate, "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR })}</span>
        </div>

        <Separator className="my-3" />

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-2">
          {alert.status === 'active' && (
            <>
              <Button 
                size="sm" 
                className="flex-1 min-w-[120px]"
                onClick={() => onViewVehicles(alert)}
              >
                <Search className="h-4 w-4 mr-1.5" />
                Buscar Veículos
              </Button>
              
              <Button 
                size="sm" 
                variant="outline"
                className="gap-1.5"
                onClick={() => onOpenWhatsApp(alert.customer_phone)}
              >
                <MessageCircle className="h-4 w-4" />
                WhatsApp
              </Button>
              
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      size="sm" 
                      variant="ghost"
                      className="gap-1.5"
                      onClick={() => onExpire(alert)}
                    >
                      <BellOff className="h-4 w-4" />
                      Expirar
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Marcar como expirado (cliente desistiu)</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </>
          )}
          
          {alert.status === 'notified' && (
            <>
              <Button 
                size="sm" 
                className="flex-1 gap-1.5"
                onClick={() => onConvert(alert)}
              >
                <Check className="h-4 w-4" />
                Marcar como Convertido
              </Button>
              
              <Button 
                size="sm" 
                variant="outline"
                className="gap-1.5"
                onClick={() => onOpenWhatsApp(alert.customer_phone)}
              >
                <MessageCircle className="h-4 w-4" />
                WhatsApp
              </Button>
              
              <Button 
                size="sm" 
                variant="ghost"
                onClick={() => onViewVehicles(alert)}
              >
                <Search className="h-4 w-4 mr-1" />
                Ver mais
              </Button>
            </>
          )}
          
          {(alert.status === 'expired' || alert.status === 'converted') && (
            <>
              <Button 
                size="sm" 
                variant="outline"
                className="gap-1.5"
                onClick={() => onOpenWhatsApp(alert.customer_phone)}
              >
                <MessageCircle className="h-4 w-4" />
                Contatar novamente
              </Button>
              
              {alert.notified_vehicle_id && (
                <Button 
                  size="sm" 
                  variant="ghost"
                  className="gap-1.5"
                  asChild
                >
                  <a href={`/inventory/${alert.notified_vehicle_id}`} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4" />
                    Ver veículo
                  </a>
                </Button>
              )}
            </>
          )}
        </div>

        {/* Notified info */}
        {alert.status === 'notified' && alert.notified_at && (
          <div className="mt-3 pt-3 border-t border-dashed">
            <div className="flex items-center gap-2 text-xs text-primary">
              <MessageCircle className="h-3 w-3" />
              <span>
                Notificado em {format(new Date(alert.notified_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
              </span>
            </div>
          </div>
        )}

        {alert.status === 'converted' && (
          <div className="mt-3 pt-3 border-t border-dashed">
            <div className="flex items-center gap-2 text-xs text-primary">
              <Check className="h-3 w-3" />
              <span className="font-medium">🎉 Cliente realizou a compra!</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
