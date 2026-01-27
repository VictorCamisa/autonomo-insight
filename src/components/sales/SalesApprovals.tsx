import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  Car, 
  User, 
  DollarSign,
  Calendar,
  AlertTriangle,
  FileText
} from 'lucide-react';
import { usePendingApprovals } from '@/hooks/useSalesTeamMetrics';
import { useUpdateSale } from '@/hooks/useSales';
import { useContracts } from '@/hooks/useContracts';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { paymentMethodLabels } from '@/types/sales';
import { parseDate } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Textarea } from '@/components/ui/textarea';
import { ContractReadinessCard } from './ContractReadinessCard';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

export function SalesApprovals() {
  const { data: pendingApprovals, isLoading } = usePendingApprovals();
  const { contracts } = useContracts();
  const updateSale = useUpdateSale();
  const { toast } = useToast();
  
  const [selectedSale, setSelectedSale] = useState<any>(null);
  const [actionType, setActionType] = useState<'approve' | 'reject' | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  // Verifica se existe contrato para a venda (pelo vehicle_id ou customer_id)
  const hasContractForSale = (vehicleId: string, customerId: string) => {
    return contracts.some(c => 
      c.contract_type === 'venda' && 
      (c.vehicle_id === vehicleId || c.customer_id === customerId)
    );
  };

  const handleApprove = async () => {
    if (!selectedSale) return;
    
    await updateSale.mutateAsync({
      id: selectedSale.id,
      status: 'concluida',
    });
    
    toast({
      title: 'Venda aprovada!',
      description: `A venda de ${selectedSale.vehicle?.brand} ${selectedSale.vehicle?.model} foi concluída.`,
    });
    
    setSelectedSale(null);
    setActionType(null);
  };

  const handleReject = async () => {
    if (!selectedSale) return;
    
    await updateSale.mutateAsync({
      id: selectedSale.id,
      status: 'cancelada',
      notes: rejectReason ? `CANCELADO: ${rejectReason}` : selectedSale.notes,
    });
    
    toast({
      title: 'Venda cancelada',
      description: `A venda foi marcada como cancelada.`,
      variant: 'destructive',
    });
    
    setSelectedSale(null);
    setActionType(null);
    setRejectReason('');
  };

  if (isLoading) {
    return <div className="flex items-center justify-center p-8">Carregando...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <Card className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 border-amber-500/20">
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-full bg-amber-500/20">
              <Clock className="h-6 w-6 text-amber-500" />
            </div>
            <div>
              <h2 className="text-xl font-semibold">Vendas Aguardando Aprovação</h2>
              <p className="text-muted-foreground">
                {pendingApprovals?.length || 0} vendas pendentes de aprovação do gerente
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Pending Sales List */}
      {pendingApprovals && pendingApprovals.length > 0 ? (
        <div className="grid gap-4">
          {pendingApprovals.map((sale: any) => {
            const hasContract = hasContractForSale(sale.vehicle_id, sale.customer_id);
            
            return (
              <Card key={sale.id} className="hover:border-primary/50 transition-colors">
                <CardContent className="p-6">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    {/* Sale Info */}
                    <div className="flex-1 space-y-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-semibold text-lg flex items-center gap-2">
                            <Car className="h-5 w-5 text-primary" />
                            {sale.vehicle?.brand} {sale.vehicle?.model} {sale.vehicle?.year_model}
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            Placa: {sale.vehicle?.plate || 'N/A'}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {hasContract ? (
                            <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30">
                              <FileText className="h-3 w-3 mr-1" /> Contrato Gerado
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="bg-orange-500/10 text-orange-600 border-orange-500/30 animate-pulse">
                              <AlertTriangle className="h-3 w-3 mr-1" /> Sem Contrato
                            </Badge>
                          )}
                          <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/30">
                            <Clock className="h-3 w-3 mr-1" /> Pendente
                          </Badge>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="text-muted-foreground">Cliente</p>
                            <p className="font-medium">{sale.customer?.name}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="text-muted-foreground">Vendedor</p>
                            <p className="font-medium">{sale.salesperson?.full_name}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="text-muted-foreground">Data</p>
                            <p className="font-medium">
                              {(() => {
                                const date = parseDate(sale.sale_date);
                                return date ? format(date, 'dd/MM/yyyy', { locale: ptBR }) : '-';
                              })()}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <DollarSign className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="text-muted-foreground">Pagamento</p>
                            <p className="font-medium">{paymentMethodLabels[sale.payment_method]}</p>
                          </div>
                        </div>
                      </div>

                      {sale.notes && (
                        <p className="text-sm text-muted-foreground bg-muted/50 p-2 rounded">
                          {sale.notes}
                        </p>
                      )}

                      {/* Contract Readiness Card */}
                      <ContractReadinessCard 
                        sale={{
                          id: sale.id,
                          customer_id: sale.customer_id,
                          vehicle_id: sale.vehicle_id,
                          sale_price: sale.sale_price,
                          payment_method: sale.payment_method,
                          payment_details: sale.payment_details,
                          notes: sale.notes,
                        }}
                      />
                    </div>

                    {/* Price and Actions */}
                    <div className="flex flex-col items-end gap-3">
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">Valor da Venda</p>
                        <p className="text-2xl font-bold text-primary">
                          {formatCurrency(sale.sale_price)}
                        </p>
                      </div>

                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          className="border-red-500/30 text-red-600 hover:bg-red-500/10"
                          onClick={() => {
                            setSelectedSale(sale);
                            setActionType('reject');
                          }}
                        >
                          <XCircle className="h-4 w-4 mr-2" />
                          Rejeitar
                        </Button>
                        
                        <Button
                          className="bg-green-600 hover:bg-green-700"
                          onClick={() => {
                            setSelectedSale(sale);
                            setActionType('approve');
                          }}
                        >
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Aprovar
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="p-12 text-center">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold">Nenhuma venda pendente</h3>
            <p className="text-muted-foreground">
              Todas as vendas foram processadas
            </p>
          </CardContent>
        </Card>
      )}

      {/* Approve Dialog */}
      <AlertDialog open={actionType === 'approve'} onOpenChange={() => setActionType(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Aprovar Venda</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja aprovar a venda de{' '}
              <strong>{selectedSale?.vehicle?.brand} {selectedSale?.vehicle?.model}</strong> por{' '}
              <strong>{formatCurrency(selectedSale?.sale_price || 0)}</strong>?
              <br /><br />
              Esta ação irá marcar a venda como concluída e atualizar o status do veículo.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleApprove}
              className="bg-green-600 hover:bg-green-700"
            >
              Confirmar Aprovação
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reject Dialog */}
      <AlertDialog open={actionType === 'reject'} onOpenChange={() => setActionType(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              Rejeitar Venda
            </AlertDialogTitle>
            <AlertDialogDescription>
              Informe o motivo da rejeição da venda de{' '}
              <strong>{selectedSale?.vehicle?.brand} {selectedSale?.vehicle?.model}</strong>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Textarea
            placeholder="Motivo da rejeição (opcional)"
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            rows={3}
          />
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleReject}
              className="bg-red-600 hover:bg-red-700"
            >
              Confirmar Rejeição
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
