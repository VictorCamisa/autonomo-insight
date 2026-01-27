import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, DollarSign, Car, Calendar, Target } from 'lucide-react';
import { SaleProfitReport, saleStatusLabels, saleStatusColors } from '@/types/sales';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { parseDate } from '@/lib/utils';

interface ProfitReportCardProps {
  report: SaleProfitReport;
}

export function ProfitReportCard({ report }: ProfitReportCardProps) {
  const formatCurrency = (value: number | null) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
  };

  const netProfit = report.net_profit || 0;
  const isProfitable = netProfit > 0;
  const marginPercent = report.sale_price > 0 
    ? ((netProfit / report.sale_price) * 100).toFixed(1)
    : '0';

  return (
    <Card className={`border-l-4 ${isProfitable ? 'border-l-green-500' : 'border-l-red-500'}`}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <Car className="h-4 w-4" />
              {report.brand} {report.model}
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              {report.year_model} • {report.plate || 'Sem placa'}
            </p>
          </div>
          <Badge className={saleStatusColors[report.status]}>
            {saleStatusLabels[report.status]}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Calendar className="h-4 w-4" />
          <span>{(() => {
            const date = parseDate(report.sale_date);
            return date ? format(date, 'dd/MM/yyyy', { locale: ptBR }) : '-';
          })()}</span>
          {report.days_in_stock && (
            <span className="ml-2">• {report.days_in_stock} dias em estoque</span>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-muted-foreground">Preço de Venda</p>
            <p className="text-lg font-semibold">{formatCurrency(report.sale_price)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Investimento Total</p>
            <p className="text-lg font-semibold">{formatCurrency(report.vehicle_total_investment)}</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 text-xs">
          <div className="bg-muted/50 p-2 rounded">
            <p className="text-muted-foreground">Custos Veículo</p>
            <p className="font-medium">{formatCurrency(report.vehicle_total_costs)}</p>
          </div>
          <div className="bg-muted/50 p-2 rounded">
            <p className="text-muted-foreground">Custos Venda</p>
            <p className="font-medium">{formatCurrency(report.total_sale_costs)}</p>
          </div>
          <div className="bg-muted/50 p-2 rounded">
            <p className="text-muted-foreground">Comissões</p>
            <p className="font-medium">{formatCurrency(report.total_commissions)}</p>
          </div>
        </div>

        {report.lead_cac && report.lead_cac > 0 && (
          <div className="bg-muted/50 p-2 rounded text-xs">
            <p className="text-muted-foreground">CAC (Custo Aquisição Lead)</p>
            <p className="font-medium">{formatCurrency(report.lead_cac)}</p>
          </div>
        )}

        <div className={`flex items-center justify-between p-3 rounded-lg ${isProfitable ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
          <div className="flex items-center gap-2">
            {isProfitable ? (
              <TrendingUp className="h-5 w-5 text-green-500" />
            ) : (
              <TrendingDown className="h-5 w-5 text-red-500" />
            )}
            <div>
              <p className="text-xs text-muted-foreground">Lucro Líquido</p>
              <p className={`text-xl font-bold ${isProfitable ? 'text-green-500' : 'text-red-500'}`}>
                {formatCurrency(netProfit)}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Margem</p>
            <p className={`text-lg font-semibold ${isProfitable ? 'text-green-500' : 'text-red-500'}`}>
              {marginPercent}%
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
