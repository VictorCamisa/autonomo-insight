import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  FileText, 
  Search, 
  Plus, 
  Download, 
  Calendar,
  User,
  Car,
  CheckCircle2,
  Clock,
  AlertCircle
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useContracts } from '@/hooks/useContracts';
import { ContractFormDialog } from './ContractFormDialog';
import { TradeInVehicleDialog } from './TradeInVehicleDialog';
import { downloadContractPDF } from '@/lib/contractPdf';

const statusConfig = {
  signed: { label: 'Assinado', color: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20', icon: CheckCircle2 },
  pending: { label: 'Pendente', color: 'bg-amber-500/10 text-amber-600 border-amber-500/20', icon: Clock },
  draft: { label: 'Rascunho', color: 'bg-muted text-muted-foreground border-muted', icon: AlertCircle },
  cancelled: { label: 'Cancelado', color: 'bg-destructive/10 text-destructive border-destructive/20', icon: AlertCircle },
};

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
};

export function ContractsListPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [showTradeInDialog, setShowTradeInDialog] = useState(false);
  const { contracts, stats, isLoading } = useContracts();

  // Handle trade_in query param from notification
  const tradeInContractId = searchParams.get('trade_in');
  const tradeInContract = tradeInContractId 
    ? contracts.find(c => c.id === tradeInContractId) 
    : null;

  useEffect(() => {
    if (tradeInContract) {
      setShowTradeInDialog(true);
      // Clear the query param after opening
      setSearchParams({});
    }
  }, [tradeInContract, setSearchParams]);

  const filteredContracts = contracts.filter(contract =>
    contract.contract_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
    contract.customer_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    `${contract.vehicle_brand} ${contract.vehicle_model}`.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-6 space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total de Contratos</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <FileText className="h-8 w-8 text-primary opacity-80" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Assinados</p>
                <p className="text-2xl font-bold text-emerald-600">{stats.signed}</p>
              </div>
              <CheckCircle2 className="h-8 w-8 text-emerald-600 opacity-80" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pendentes</p>
                <p className="text-2xl font-bold text-amber-600">{stats.pending}</p>
              </div>
              <Clock className="h-8 w-8 text-amber-600 opacity-80" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Rascunhos</p>
                <p className="text-2xl font-bold text-muted-foreground">{stats.draft}</p>
              </div>
              <AlertCircle className="h-8 w-8 text-muted-foreground opacity-80" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Header with Search and Actions */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar contratos..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Novo Contrato
        </Button>
      </div>

      {/* Contracts List */}
      {filteredContracts.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Nenhum contrato encontrado</p>
            <p className="text-sm text-muted-foreground mt-1">Crie seu primeiro contrato clicando no botão acima</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredContracts.map((contract) => {
            const config = statusConfig[contract.status as keyof typeof statusConfig] || statusConfig.draft;
            const StatusIcon = config.icon;
            return (
              <Card key={contract.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <div className="p-3 rounded-lg bg-primary/10">
                        <FileText className="h-6 w-6 text-primary" />
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold">{contract.contract_number}</h3>
                          <Badge variant="outline" className={config.color}>
                            <StatusIcon className="h-3 w-3 mr-1" />
                            {config.label}
                          </Badge>
                          <Badge variant="secondary">
                            {contract.contract_type === 'venda' ? 'Venda' : 'Compra'}
                          </Badge>
                        </div>
                        <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <User className="h-4 w-4" />
                            {contract.customer_name}
                          </span>
                          <span className="flex items-center gap-1">
                            <Car className="h-4 w-4" />
                            {contract.vehicle_brand} {contract.vehicle_model}
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            {format(new Date(contract.created_at), "dd/MM/yyyy", { locale: ptBR })}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">Valor</p>
                        <p className="font-semibold text-lg">{formatCurrency(contract.vehicle_value)}</p>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="icon" onClick={() => downloadContractPDF(contract)}>
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <ContractFormDialog open={showForm} onOpenChange={setShowForm} />
      <TradeInVehicleDialog 
        open={showTradeInDialog} 
        onOpenChange={setShowTradeInDialog} 
        contract={tradeInContract || null}
      />
    </div>
  );
}
