import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Edit, Trash2, Car, User, Calendar, DollarSign, FileText, AlertTriangle } from 'lucide-react';
import { Sale, saleStatusLabels, saleStatusColors, paymentMethodLabels } from '@/types/sales';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { parseDate } from '@/lib/utils';
import { SaleDetailModal } from './SaleDetailModal';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface SaleCardProps {
  sale: Sale;
  hasContract?: boolean;
  onEdit?: (sale: Sale) => void;
  onDelete?: (id: string) => void;
  onGenerateContract?: (sale: Sale) => void;
}

// Campos necessários para gerar um contrato completo
interface MissingField {
  key: string;
  label: string;
  category: 'cliente' | 'veiculo';
}

function getMissingContractFields(sale: Sale): MissingField[] {
  const missing: MissingField[] = [];

  // Campos do cliente
  if (!sale.customer?.cpf_cnpj) missing.push({ key: 'cpf', label: 'CPF', category: 'cliente' });
  if (!sale.customer?.rg) missing.push({ key: 'rg', label: 'RG', category: 'cliente' });
  if (!sale.customer?.address) missing.push({ key: 'address', label: 'Endereço', category: 'cliente' });
  if (!sale.customer?.city) missing.push({ key: 'city', label: 'Cidade', category: 'cliente' });
  if (!sale.customer?.state) missing.push({ key: 'state', label: 'Estado', category: 'cliente' });

  // Campos do veículo
  if (!sale.vehicle?.plate) missing.push({ key: 'plate', label: 'Placa', category: 'veiculo' });
  if (!sale.vehicle?.renavam) missing.push({ key: 'renavam', label: 'Renavam', category: 'veiculo' });
  if (!sale.vehicle?.color) missing.push({ key: 'color', label: 'Cor', category: 'veiculo' });

  return missing;
}

export function SaleCard({ sale, hasContract = false, onEdit, onDelete, onGenerateContract }: SaleCardProps) {
  const [detailOpen, setDetailOpen] = useState(false);

  const missingFields = useMemo(() => getMissingContractFields(sale), [sale]);

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
          <div className="pt-2 border-t border-border/50 space-y-2">
            {hasContract ? (
              <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/30">
                <FileText className="h-3 w-3 mr-1" />
                Contrato Gerado
              </Badge>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Badge variant="outline" className="bg-amber-500/10 text-amber-500 border-amber-500/30 cursor-help">
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          Sem Contrato
                        </Badge>
                      </TooltipTrigger>
                      {missingFields.length > 0 && (
                        <TooltipContent side="top" className="max-w-xs">
                          <p className="font-medium mb-1">Campos faltantes:</p>
                          <ul className="text-xs space-y-0.5">
                            {missingFields.map((f) => (
                              <li key={f.key}>• {f.label} ({f.category === 'cliente' ? 'Cliente' : 'Veículo'})</li>
                            ))}
                          </ul>
                        </TooltipContent>
                      )}
                    </Tooltip>
                  </TooltipProvider>
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

                {/* Missing fields display */}
                {missingFields.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {missingFields.slice(0, 4).map((field) => (
                      <Badge 
                        key={field.key} 
                        variant="outline" 
                        className="text-[10px] px-1.5 py-0 h-5 bg-muted/50 text-muted-foreground border-muted-foreground/30"
                      >
                        {field.label}
                      </Badge>
                    ))}
                    {missingFields.length > 4 && (
                      <Badge 
                        variant="outline" 
                        className="text-[10px] px-1.5 py-0 h-5 bg-muted/50 text-muted-foreground border-muted-foreground/30"
                      >
                        +{missingFields.length - 4}
                      </Badge>
                    )}
                  </div>
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
