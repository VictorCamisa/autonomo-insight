import { TrendingUp, TrendingDown, Clock, DollarSign, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import type { VehicleDRE } from '@/types/inventory';
import { vehicleStatusLabels, vehicleStatusColors } from '@/types/inventory';

interface VehicleDRECardProps {
  dre: VehicleDRE;
  onClick?: () => void;
}

export function VehicleDRECard({ dre, onClick }: VehicleDRECardProps) {
  const formatCurrency = (value: number | null) => {
    if (value === null || value === undefined) return '-';
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  // Calcular margem potencial
  const potentialMargin = dre.sale_price ? dre.sale_price - dre.total_investment : null;
  const marginPercent = dre.sale_price && dre.total_investment > 0
    ? ((potentialMargin || 0) / dre.total_investment) * 100
    : null;

  // Verificar se está acima do tempo esperado
  const isOverdue = dre.expected_sale_days && dre.days_in_stock > dre.expected_sale_days;
  const daysProgress = dre.expected_sale_days 
    ? Math.min((dre.days_in_stock / dre.expected_sale_days) * 100, 100)
    : 0;

  // Comparar custos reais vs estimados
  const costVariance = dre.total_real_costs - dre.total_estimated_costs;
  const hasCostOverrun = costVariance > 0;

  return (
    <Card 
      className={`cursor-pointer hover:shadow-md transition-shadow ${isOverdue ? 'border-destructive/50' : ''}`}
      onClick={onClick}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg">{dre.brand} {dre.model}</CardTitle>
            <p className="text-sm text-muted-foreground">
              {dre.year_model} {dre.plate && `• ${dre.plate}`}
            </p>
          </div>
          <Badge className={vehicleStatusColors[dre.status]}>
            {vehicleStatusLabels[dre.status]}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Investimento Total */}
        <div className="flex justify-between items-center">
          <span className="text-sm text-muted-foreground">Investimento Total</span>
          <span className="font-semibold">{formatCurrency(dre.total_investment)}</span>
        </div>

        {/* Preço de Venda */}
        <div className="flex justify-between items-center">
          <span className="text-sm text-muted-foreground">Preço de Venda</span>
          <span className="font-semibold">{formatCurrency(dre.sale_price)}</span>
        </div>


        {/* Margem Potencial */}
        {potentialMargin !== null && (
          <div className="flex justify-between items-center p-2 rounded-lg bg-muted/50">
            <span className="text-sm font-medium flex items-center gap-1">
              {potentialMargin >= 0 ? (
                <TrendingUp className="h-4 w-4 text-green-500" />
              ) : (
                <TrendingDown className="h-4 w-4 text-destructive" />
              )}
              Margem Potencial
            </span>
            <div className="text-right">
              <span className={`font-bold ${potentialMargin >= 0 ? 'text-green-600' : 'text-destructive'}`}>
                {formatCurrency(potentialMargin)}
              </span>
              {marginPercent !== null && (
                <span className="text-xs text-muted-foreground block">
                  ({marginPercent.toFixed(1)}%)
                </span>
              )}
            </div>
          </div>
        )}

        {/* Dias em Estoque */}
        <div className="space-y-1">
          <div className="flex justify-between items-center text-sm">
            <span className="text-muted-foreground">Dias em Estoque</span>
            <span className={isOverdue ? 'text-destructive font-medium' : ''}>
              {dre.days_in_stock} dias
              {dre.expected_sale_days && ` / ${dre.expected_sale_days}`}
            </span>
          </div>
          {dre.expected_sale_days && (
            <Progress 
              value={daysProgress} 
              className={`h-2 ${isOverdue ? '[&>div]:bg-destructive' : ''}`}
            />
          )}
        </div>

        {/* Alerta de Custo */}
        {hasCostOverrun && (
          <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 p-2 rounded">
            <AlertTriangle className="h-4 w-4" />
            <span>
              Custos {formatCurrency(costVariance)} acima do estimado
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
