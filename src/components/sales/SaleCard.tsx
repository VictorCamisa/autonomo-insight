import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Edit, Trash2, Car, User, Calendar, DollarSign, FileText, AlertTriangle } from 'lucide-react';
import { Sale, saleStatusLabels, saleStatusColors, paymentMethodLabels } from '@/types/sales';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { parseDate } from '@/lib/utils';
import { SaleDetailModal } from './SaleDetailModal';

interface SaleCardProps {
  sale: Sale;
  hasContract?: boolean;
  onEdit?: (sale: Sale) => void;
  onDelete?: (id: string) => void;
  onGenerateContract?: (sale: Sale) => void;
}

export function SaleCard({ sale, hasContract = false, onEdit, onDelete, onGenerateContract }: SaleCardProps) {
  const [detailOpen, setDetailOpen] = useState(false);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  return (
    <>
      <Card 
        className="hover:border-primary/50 transition-colors cursor-pointer"
        onClick={() => setDetailOpen(true)}
      >
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <Car className="h-4 w-4" />
                {sale.vehicle?.brand} {sale.vehicle?.model}
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                {sale.vehicle?.year_model} • {sale.vehicle?.plate || 'Sem placa'}
              </p>
            </div>
            <Badge className={saleStatusColors[sale.status]}>
              {saleStatusLabels[sale.status]}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2 text-sm">
            <User className="h-4 w-4 text-muted-foreground" />
            <span>{sale.customer?.name}</span>
          </div>
          
          <div className="flex items-center gap-2 text-sm">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span>{parseDate(sale.sale_date) ? format(parseDate(sale.sale_date)!, 'dd/MM/yyyy', { locale: ptBR }) : '-'}</span>
          </div>

          <div className="flex items-center gap-2 text-sm">
            <DollarSign className="h-4 w-4 text-muted-foreground" />
            <span className="font-semibold text-lg">{formatCurrency(sale.sale_price)}</span>
          </div>

          <div className="text-xs text-muted-foreground">
            {paymentMethodLabels[sale.payment_method]}
          </div>

          {/* Contract Status Indicator */}
          <div className="pt-2 border-t border-border/50">
            {hasContract ? (
              <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/30">
                <FileText className="h-3 w-3 mr-1" />
                Contrato Gerado
              </Badge>
            ) : (
              <div className="flex items-center justify-between">
                <Badge variant="outline" className="bg-amber-500/10 text-amber-500 border-amber-500/30">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  Sem Contrato
                </Badge>
                {onGenerateContract && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-xs h-7"
                    onClick={(e) => { e.stopPropagation(); onGenerateContract(sale); }}
                  >
                    <FileText className="h-3 w-3 mr-1" />
                    Gerar Contrato
                  </Button>
                )}
              </div>
            )}
          </div>

          {(onEdit || onDelete) && (
            <div className="flex justify-end gap-2 pt-2 border-t border-border/50">
              {onEdit && (
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={(e) => { e.stopPropagation(); onEdit(sale); }}
                >
                  <Edit className="h-3 w-3 mr-1" /> Editar
                </Button>
              )}
              {onDelete && (
                <Button 
                  size="sm" 
                  variant="destructive" 
                  onClick={(e) => { e.stopPropagation(); onDelete(sale.id); }}
                >
                  <Trash2 className="h-3 w-3 mr-1" /> Excluir
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <SaleDetailModal 
        sale={sale} 
        open={detailOpen} 
        onOpenChange={setDetailOpen} 
      />
    </>
  );
}
