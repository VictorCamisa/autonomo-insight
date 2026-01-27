import { useState } from 'react';
import { Calendar, Clock, CheckCircle, XCircle, DollarSign, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  useSaleCommissions, 
  useApproveCommission, 
  useRejectCommission, 
  usePayCommission,
  useAdjustCommission
} from '@/hooks/useCommissionsComplete';
import { useAuth } from '@/contexts/AuthContext';
import { usePermissions } from '@/hooks/usePermissions';
import { commissionStatusLabels, commissionStatusColors, type SaleCommission } from '@/types/commissions';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { parseDate } from '@/lib/utils';

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
};

export function CommissionHistoryPage() {
  const [selectedCommission, setSelectedCommission] = useState<SaleCommission | null>(null);
  const [actionType, setActionType] = useState<'approve' | 'reject' | 'adjust' | 'pay' | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [adjustmentAmount, setAdjustmentAmount] = useState(0);
  const [adjustmentNotes, setAdjustmentNotes] = useState('');

  const { data: allCommissions, isLoading } = useSaleCommissions();
  const approveCommission = useApproveCommission();
  const rejectCommission = useRejectCommission();
  const payCommission = usePayCommission();
  const adjustCommission = useAdjustCommission();
  const { role } = useAuth();

  const isManager = role === 'gerente';

  const pendingCommissions = allCommissions?.filter(c => c.status === 'pending') || [];
  const approvedCommissions = allCommissions?.filter(c => c.status === 'approved') || [];
  const paidCommissions = allCommissions?.filter(c => c.status === 'paid') || [];
  const rejectedCommissions = allCommissions?.filter(c => c.status === 'rejected') || [];

  const handleAction = (commission: SaleCommission, action: 'approve' | 'reject' | 'adjust' | 'pay') => {
    setSelectedCommission(commission);
    setActionType(action);
    setRejectionReason('');
    setAdjustmentAmount(0);
    setAdjustmentNotes('');
  };

  const confirmAction = async () => {
    if (!selectedCommission) return;

    switch (actionType) {
      case 'approve':
        await approveCommission.mutateAsync({ id: selectedCommission.id });
        break;
      case 'reject':
        await rejectCommission.mutateAsync({ id: selectedCommission.id, rejection_reason: rejectionReason });
        break;
      case 'adjust':
        await adjustCommission.mutateAsync({ 
          id: selectedCommission.id, 
          manual_adjustment: adjustmentAmount,
          notes: adjustmentNotes 
        });
        break;
      case 'pay':
        await payCommission.mutateAsync(selectedCommission.id);
        break;
    }

    setSelectedCommission(null);
    setActionType(null);
  };

  const renderCommissionCard = (commission: SaleCommission, showActions: boolean = false) => (
    <Card key={commission.id} className="hover:bg-muted/30 transition-colors">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="font-semibold">{commission.user?.full_name || 'Vendedor'}</p>
            <p className="text-sm text-muted-foreground">
              {commission.sale?.vehicle?.brand} {commission.sale?.vehicle?.model}
            </p>
            {commission.sale?.sale_date && (
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {(() => {
                  const date = parseDate(commission.sale.sale_date);
                  return date ? format(date, 'dd/MM/yyyy', { locale: ptBR }) : '-';
                })()}
              </p>
            )}
            {commission.commission_rule && (
              <Badge variant="outline" className="text-xs">
                {commission.commission_rule.name}
              </Badge>
            )}
          </div>
          
          <div className="text-right space-y-1">
            <p className="text-lg font-bold">{formatCurrency(commission.final_amount)}</p>
            {commission.manual_adjustment !== null && commission.manual_adjustment !== 0 && (
              <p className="text-xs text-muted-foreground">
                Ajuste: {commission.manual_adjustment > 0 ? '+' : ''}{formatCurrency(commission.manual_adjustment)}
              </p>
            )}
            <Badge className={commissionStatusColors[commission.status]}>
              {commissionStatusLabels[commission.status]}
            </Badge>
          </div>
        </div>

        {showActions && isManager && (
          <div className="flex gap-2 mt-4 pt-4 border-t">
            {commission.status === 'pending' && (
              <>
                <Button size="sm" variant="default" onClick={() => handleAction(commission, 'approve')}>
                  <CheckCircle className="h-3 w-3 mr-1" /> Aprovar
                </Button>
                <Button size="sm" variant="destructive" onClick={() => handleAction(commission, 'reject')}>
                  <XCircle className="h-3 w-3 mr-1" /> Rejeitar
                </Button>
                <Button size="sm" variant="outline" onClick={() => handleAction(commission, 'adjust')}>
                  Ajustar
                </Button>
              </>
            )}
            {commission.status === 'approved' && (
              <Button size="sm" variant="default" className="bg-green-600 hover:bg-green-700" onClick={() => handleAction(commission, 'pay')}>
                <DollarSign className="h-3 w-3 mr-1" /> Pagar
              </Button>
            )}
          </div>
        )}

        {commission.rejection_reason && (
          <p className="text-sm text-destructive mt-2 p-2 bg-destructive/10 rounded">
            Motivo: {commission.rejection_reason}
          </p>
        )}

        {commission.notes && (
          <p className="text-sm text-muted-foreground mt-2 p-2 bg-muted/50 rounded">
            {commission.notes}
          </p>
        )}
      </CardContent>
    </Card>
  );

  if (isLoading) {
    return <div className="flex items-center justify-center p-8">Carregando...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Histórico de Comissões</h2>
        <p className="text-sm text-muted-foreground">Gestão e aprovação de comissões</p>
      </div>

      <Tabs defaultValue="pending">
        <TabsList>
          <TabsTrigger value="pending" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Pendentes
            {pendingCommissions.length > 0 && (
              <Badge variant="secondary" className="ml-1">{pendingCommissions.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="approved" className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4" />
            Aprovadas
            {approvedCommissions.length > 0 && (
              <Badge variant="secondary" className="ml-1">{approvedCommissions.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="paid" className="flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            Pagas
          </TabsTrigger>
          <TabsTrigger value="rejected" className="flex items-center gap-2">
            <XCircle className="h-4 w-4" />
            Rejeitadas
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="mt-4">
          {pendingCommissions.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                Nenhuma comissão pendente de aprovação
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {pendingCommissions.map(c => renderCommissionCard(c, true))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="approved" className="mt-4">
          {approvedCommissions.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                Nenhuma comissão aprovada aguardando pagamento
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {approvedCommissions.map(c => renderCommissionCard(c, true))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="paid" className="mt-4">
          {paidCommissions.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                Nenhuma comissão paga
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {paidCommissions.map(c => renderCommissionCard(c, false))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="rejected" className="mt-4">
          {rejectedCommissions.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                Nenhuma comissão rejeitada
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {rejectedCommissions.map(c => renderCommissionCard(c, false))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Action Dialog */}
      <Dialog open={!!actionType} onOpenChange={() => setActionType(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionType === 'approve' && 'Aprovar Comissão'}
              {actionType === 'reject' && 'Rejeitar Comissão'}
              {actionType === 'adjust' && 'Ajustar Comissão'}
              {actionType === 'pay' && 'Confirmar Pagamento'}
            </DialogTitle>
          </DialogHeader>

          {selectedCommission && (
            <div className="space-y-4">
              <div className="p-4 bg-muted rounded-lg">
                <p className="font-medium">{selectedCommission.user?.full_name}</p>
                <p className="text-2xl font-bold">{formatCurrency(selectedCommission.final_amount)}</p>
              </div>

              {actionType === 'reject' && (
                <div>
                  <Label>Motivo da Rejeição *</Label>
                  <Textarea 
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    placeholder="Informe o motivo..."
                  />
                </div>
              )}

              {actionType === 'adjust' && (
                <div className="space-y-4">
                  <div>
                    <Label>Valor do Ajuste (positivo ou negativo)</Label>
                    <Input 
                      type="number" 
                      step="0.01"
                      value={adjustmentAmount}
                      onChange={(e) => setAdjustmentAmount(Number(e.target.value))}
                      placeholder="Ex: 100 ou -50"
                    />
                    <p className="text-sm text-muted-foreground mt-1">
                      Novo valor: {formatCurrency(selectedCommission.calculated_amount + adjustmentAmount)}
                    </p>
                  </div>
                  <div>
                    <Label>Justificativa do Ajuste *</Label>
                    <Textarea 
                      value={adjustmentNotes}
                      onChange={(e) => setAdjustmentNotes(e.target.value)}
                      placeholder="Informe o motivo do ajuste..."
                    />
                  </div>
                </div>
              )}

              {actionType === 'pay' && (
                <p className="text-muted-foreground">
                  Confirma o pagamento desta comissão? Esta ação não pode ser desfeita.
                </p>
              )}

              {actionType === 'approve' && (
                <p className="text-muted-foreground">
                  Deseja aprovar esta comissão? Ela ficará disponível para pagamento.
                </p>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setActionType(null)}>
              Cancelar
            </Button>
            <Button 
              onClick={confirmAction}
              disabled={
                (actionType === 'reject' && !rejectionReason) ||
                (actionType === 'adjust' && !adjustmentNotes)
              }
              variant={actionType === 'reject' ? 'destructive' : 'default'}
            >
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
