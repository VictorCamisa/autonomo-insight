import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  FileStack, 
  Search, 
  FileText,
  Download,
  Eye
} from 'lucide-react';
import { previewSampleContract } from '@/lib/contractPdf';

// Modelos padrão do sistema
const DEFAULT_TEMPLATES = [
  {
    id: 'venda',
    name: 'Contrato de Venda de Veículo',
    description: 'Modelo padrão para venda de veículos da loja para o cliente',
    category: 'venda',
    isDefault: true,
    fields: [
      'Dados do comprador (nome, CPF, RG, endereço)',
      'Dados do veículo (marca, modelo, ano, placa, RENAVAM)',
      'Forma de pagamento (entrada, parcelas, veículo de troca)',
      'Cláusulas legais de transferência'
    ]
  },
  {
    id: 'compra',
    name: 'Contrato de Compra de Veículo',
    description: 'Modelo padrão para compra de veículos de particulares',
    category: 'venda',
    isDefault: true,
    fields: [
      'Dados do vendedor (nome, CPF, RG, endereço)',
      'Dados do veículo (marca, modelo, ano, placa, RENAVAM)',
      'Valor da compra',
      'Cláusulas de garantia e procedência'
    ]
  }
];

export function ContractTemplatesPage() {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredTemplates = DEFAULT_TEMPLATES.filter(template =>
    template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    template.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const vendaCount = DEFAULT_TEMPLATES.filter(t => t.category === 'venda').length;

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
      </div>

      {/* Template Categories */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-dashed">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Venda de Veículo</CardTitle>
            <CardDescription>Modelos para venda e compra</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{vendaCount}</p>
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

      {/* Templates List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredTemplates.map((template) => (
          <Card key={template.id} className="hover:border-primary/50 transition-colors">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <FileText className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-base">{template.name}</CardTitle>
                    <CardDescription className="mt-1">{template.description}</CardDescription>
                  </div>
                </div>
                <Badge variant="secondary" className="text-xs">
                  Padrão
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2">Campos incluídos:</p>
                <ul className="text-xs text-muted-foreground space-y-1">
                  {template.fields.map((field, idx) => (
                    <li key={idx} className="flex items-center gap-2">
                      <span className="h-1 w-1 rounded-full bg-muted-foreground" />
                      {field}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="flex gap-2 pt-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="flex-1"
                  onClick={() => previewSampleContract(template.id as 'venda' | 'compra')}
                >
                  <Eye className="h-3.5 w-3.5 mr-1.5" />
                  Visualizar
                </Button>
                <Button size="sm" className="flex-1" asChild>
                  <a href="/vendas/contratos">
                    <Download className="h-3.5 w-3.5 mr-1.5" />
                    Usar Modelo
                  </a>
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredTemplates.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center">
            <FileStack className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Nenhum modelo encontrado</p>
            <p className="text-sm text-muted-foreground mt-1">Tente uma busca diferente</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
