import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  FileSignature, 
  Search, 
  CheckCircle2,
  Clock,
  XCircle,
  Mail,
  RefreshCw
} from 'lucide-react';

export function ContractSignaturesPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [signatures] = useState<any[]>([]);

  const stats = {
    total: signatures.length,
    signed: signatures.filter(s => s.status === 'signed').length,
    pending: signatures.filter(s => s.status === 'pending').length,
    expired: signatures.filter(s => s.status === 'expired').length,
  };

  return (
    <div className="p-6 space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total de Assinaturas</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <FileSignature className="h-8 w-8 text-primary opacity-80" />
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
                <p className="text-sm text-muted-foreground">Aguardando</p>
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
                <p className="text-sm text-muted-foreground">Expirados</p>
                <p className="text-2xl font-bold text-destructive">{stats.expired}</p>
              </div>
              <XCircle className="h-8 w-8 text-destructive opacity-80" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Header with Search */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar assinaturas..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Atualizar Status
          </Button>
        </div>
      </div>

      {/* Empty State */}
      <Card>
        <CardContent className="p-8 text-center">
          <FileSignature className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">Nenhuma assinatura pendente</p>
          <p className="text-sm text-muted-foreground mt-1">As assinaturas enviadas aparecerão aqui</p>
        </CardContent>
      </Card>
    </div>
  );
}
