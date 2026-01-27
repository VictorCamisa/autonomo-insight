import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Car, 
  User, 
  Calendar, 
  DollarSign, 
  CreditCard, 
  FileText, 
  Phone, 
  Mail,
  MapPin,
  Clock,
  UserCheck,
  Receipt,
  TrendingUp,
  Banknote
} from 'lucide-react';
import { Sale, saleStatusLabels, saleStatusColors, paymentMethodLabels } from '@/types/sales';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { parseDate } from '@/lib/utils';

interface SaleDetailModalProps {
  sale: Sale | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SaleDetailModal({ sale, open, onOpenChange }: SaleDetailModalProps) {
  if (!sale) return null;

  const formatCurrency = (value: number | null | undefined) => {
    if (value === null || value === undefined) return 'R$ 0,00';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const formatDate = (dateString: string | null | undefined) => {
    const date = parseDate(dateString);
    if (!date) return '-';
    return format(date, "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
  };

  const formatDateTime = (dateString: string | null | undefined) => {
    if (!dateString) return '-';
    const date = parseDate(dateString);
    return date ? format(date, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR }) : '-';
  };

  const totalCosts = (sale.documentation_cost || 0) + (sale.transfer_cost || 0) + (sale.other_sale_costs || 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="pb-4">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-2xl flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Receipt className="h-6 w-6 text-primary" />
              </div>
              Detalhes da Venda
            </DialogTitle>
            <Badge className={`${saleStatusColors[sale.status]} text-sm px-3 py-1`}>
              {saleStatusLabels[sale.status]}
            </Badge>
          </div>
        </DialogHeader>

        <div className="grid gap-6">
          {/* Veículo */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Car className="h-5 w-5 text-primary" />
                Veículo
              </CardTitle>
            </CardHeader>
            <CardContent className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Marca</p>
                <p className="font-medium">{sale.vehicle?.brand || '-'}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Modelo</p>
                <p className="font-medium">{sale.vehicle?.model || '-'}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Ano</p>
                <p className="font-medium">{sale.vehicle?.year_model || '-'}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Placa</p>
                <p className="font-medium">{sale.vehicle?.plate || 'Sem placa'}</p>
              </div>
            </CardContent>
          </Card>

          {/* Cliente */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <User className="h-5 w-5 text-primary" />
                Cliente
              </CardTitle>
            </CardHeader>
            <CardContent className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Nome</p>
                <p className="font-medium">{sale.customer?.name || '-'}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Telefone</p>
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <p className="font-medium">{sale.customer?.phone || '-'}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Valores e Pagamento */}
          <div className="grid sm:grid-cols-2 gap-6">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-primary" />
                  Valor da Venda
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-primary">
                  {formatCurrency(sale.sale_price)}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <CreditCard className="h-5 w-5 text-primary" />
                  Forma de Pagamento
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="text-lg font-semibold">
                  {paymentMethodLabels[sale.payment_method]}
                </div>
                {sale.payment_details && (
                  <p className="text-sm text-muted-foreground">{sale.payment_details}</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Custos */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Banknote className="h-5 w-5 text-primary" />
                Custos da Venda
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid sm:grid-cols-4 gap-4">
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Documentação</p>
                  <p className="font-semibold">{formatCurrency(sale.documentation_cost)}</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Transferência</p>
                  <p className="font-semibold">{formatCurrency(sale.transfer_cost)}</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Outros Custos</p>
                  <p className="font-semibold">{formatCurrency(sale.other_sale_costs)}</p>
                </div>
                <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
                  <p className="text-xs text-primary uppercase tracking-wide mb-1 font-medium">Total de Custos</p>
                  <p className="font-bold text-primary">{formatCurrency(totalCosts)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Vendedor e Datas */}
          <div className="grid sm:grid-cols-2 gap-6">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <UserCheck className="h-5 w-5 text-primary" />
                  Vendedor
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="font-medium text-lg">{sale.salesperson?.full_name || 'Não atribuído'}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-primary" />
                  Datas
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Data da Venda</span>
                  <span className="font-medium">{formatDate(sale.sale_date)}</span>
                </div>
                <Separator />
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Criado em</span>
                  <span className="text-sm">{formatDateTime(sale.created_at)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Atualizado em</span>
                  <span className="text-sm">{formatDateTime(sale.updated_at)}</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Observações */}
          {sale.notes && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  Observações
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground whitespace-pre-wrap">{sale.notes}</p>
              </CardContent>
            </Card>
          )}

          {/* Resumo Financeiro */}
          <Card className="border-primary/30 bg-primary/5">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                Resumo Financeiro
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid sm:grid-cols-3 gap-4">
                <div className="text-center p-4 rounded-lg bg-background">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Valor Bruto</p>
                  <p className="text-2xl font-bold">{formatCurrency(sale.sale_price)}</p>
                </div>
                <div className="text-center p-4 rounded-lg bg-background">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Custos</p>
                  <p className="text-2xl font-bold text-destructive">- {formatCurrency(totalCosts)}</p>
                </div>
                <div className="text-center p-4 rounded-lg bg-primary/10 border border-primary/20">
                  <p className="text-xs text-primary uppercase tracking-wide mb-1 font-medium">Valor Líquido</p>
                  <p className="text-2xl font-bold text-primary">{formatCurrency(sale.sale_price - totalCosts)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}
