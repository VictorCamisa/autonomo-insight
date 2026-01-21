import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  FileText, 
  Search, 
  Plus, 
  Download, 
  Eye,
  Calendar,
  User,
  Car,
  CheckCircle2,
  Clock,
  AlertCircle
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// Mock data for contracts
const mockContracts = [
  {
    id: '1',
    number: 'CONT-2024-001',
    type: 'Venda',
    customer: 'João Silva',
    vehicle: 'Toyota Corolla 2023',
    value: 125000,
    date: new Date('2024-01-15'),
    status: 'signed',
    salesperson: 'Carlos Vendedor'
  },
  {
    id: '2',
    number: 'CONT-2024-002',
    type: 'Venda',
    customer: 'Maria Santos',
    vehicle: 'Honda Civic 2022',
    value: 98000,
    date: new Date('2024-01-18'),
    status: 'pending',
    salesperson: 'Ana Silva'
  },
  {
    id: '3',
    number: 'CONT-2024-003',
    type: 'Consignação',
    customer: 'Pedro Costa',
    vehicle: 'Volkswagen Golf 2021',
    value: 85000,
    date: new Date('2024-01-20'),
    status: 'draft',
    salesperson: 'Carlos Vendedor'
  },
];

const statusConfig = {
  signed: { label: 'Assinado', color: 'bg-green-500/10 text-green-600 border-green-500/20', icon: CheckCircle2 },
  pending: { label: 'Pendente', color: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20', icon: Clock },
  draft: { label: 'Rascunho', color: 'bg-gray-500/10 text-gray-600 border-gray-500/20', icon: AlertCircle },
};

export function ContractsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [contracts] = useState(mockContracts);

  const filteredContracts = contracts.filter(contract =>
    contract.number.toLowerCase().includes(searchQuery.toLowerCase()) ||
    contract.customer.toLowerCase().includes(searchQuery.toLowerCase()) ||
    contract.vehicle.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const stats = {
    total: contracts.length,
    signed: contracts.filter(c => c.status === 'signed').length,
    pending: contracts.filter(c => c.status === 'pending').length,
    draft: contracts.filter(c => c.status === 'draft').length,
  };

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
                <p className="text-2xl font-bold text-green-600">{stats.signed}</p>
              </div>
              <CheckCircle2 className="h-8 w-8 text-green-600 opacity-80" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pendentes</p>
                <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
              </div>
              <Clock className="h-8 w-8 text-yellow-600 opacity-80" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Rascunhos</p>
                <p className="text-2xl font-bold text-gray-600">{stats.draft}</p>
              </div>
              <AlertCircle className="h-8 w-8 text-gray-600 opacity-80" />
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
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Novo Contrato
        </Button>
      </div>

      {/* Contracts List */}
      <div className="space-y-4">
        {filteredContracts.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Nenhum contrato encontrado</p>
            </CardContent>
          </Card>
        ) : (
          filteredContracts.map((contract) => {
            const StatusIcon = statusConfig[contract.status as keyof typeof statusConfig].icon;
            return (
              <Card key={contract.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <div className="p-3 rounded-lg bg-primary/10">
                        <FileText className="h-6 w-6 text-primary" />
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold">{contract.number}</h3>
                          <Badge variant="outline" className={statusConfig[contract.status as keyof typeof statusConfig].color}>
                            <StatusIcon className="h-3 w-3 mr-1" />
                            {statusConfig[contract.status as keyof typeof statusConfig].label}
                          </Badge>
                          <Badge variant="secondary">{contract.type}</Badge>
                        </div>
                        <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <User className="h-4 w-4" />
                            {contract.customer}
                          </span>
                          <span className="flex items-center gap-1">
                            <Car className="h-4 w-4" />
                            {contract.vehicle}
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            {format(contract.date, "dd/MM/yyyy", { locale: ptBR })}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">Valor</p>
                        <p className="font-semibold text-lg">{formatCurrency(contract.value)}</p>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="icon">
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="icon">
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
