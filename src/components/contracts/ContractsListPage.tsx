import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
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

const statusConfig = {
  signed: { label: 'Assinado', color: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20', icon: CheckCircle2 },
  pending: { label: 'Pendente', color: 'bg-amber-500/10 text-amber-600 border-amber-500/20', icon: Clock },
  draft: { label: 'Rascunho', color: 'bg-muted text-muted-foreground border-muted', icon: AlertCircle },
};

export function ContractsListPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [contracts] = useState<any[]>([]);

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
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Novo Contrato
        </Button>
      </div>

      {/* Empty State */}
      <Card>
        <CardContent className="p-8 text-center">
          <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">Nenhum contrato encontrado</p>
          <p className="text-sm text-muted-foreground mt-1">Crie seu primeiro contrato clicando no botão acima</p>
        </CardContent>
      </Card>
    </div>
  );
}
