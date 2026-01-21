import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  FileStack, 
  Search, 
  Plus,
  Edit,
  Copy,
  Trash2,
  FileText
} from 'lucide-react';

export function ContractTemplatesPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [templates] = useState<any[]>([]);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar modelos..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Novo Modelo
        </Button>
      </div>

      {/* Template Categories */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-dashed">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Venda de Veículo</CardTitle>
            <CardDescription>Modelos para venda direta</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">0</p>
            <p className="text-sm text-muted-foreground">modelos</p>
          </CardContent>
        </Card>
        <Card className="border-dashed">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Consignação</CardTitle>
            <CardDescription>Modelos para consignação</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">0</p>
            <p className="text-sm text-muted-foreground">modelos</p>
          </CardContent>
        </Card>
        <Card className="border-dashed">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Outros</CardTitle>
            <CardDescription>Modelos diversos</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">0</p>
            <p className="text-sm text-muted-foreground">modelos</p>
          </CardContent>
        </Card>
      </div>

      {/* Empty State */}
      <Card>
        <CardContent className="p-8 text-center">
          <FileStack className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">Nenhum modelo de contrato</p>
          <p className="text-sm text-muted-foreground mt-1">Crie modelos para agilizar a geração de contratos</p>
          <Button className="mt-4">
            <Plus className="h-4 w-4 mr-2" />
            Criar Primeiro Modelo
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
