import { useParams, useNavigate } from 'react-router-dom';
import { Wrench, ArrowRight, Search, UserPlus, Calendar, Calculator, PhoneForwarded, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { useAIAgent } from '@/hooks/useAIAgents';

const BUILT_IN_TOOLS = [
  {
    id: 'search_vehicles',
    name: 'Buscar Veículos',
    description: 'Pesquisa veículos no estoque por marca, modelo, ano, preço e combustível',
    icon: Search,
    enabled: true,
    category: 'Estoque',
  },
  {
    id: 'create_or_update_lead',
    name: 'Criar/Atualizar Lead',
    description: 'Registra novos leads ou atualiza informações de contato no CRM',
    icon: UserPlus,
    enabled: true,
    category: 'CRM',
  },
  {
    id: 'schedule_visit',
    name: 'Agendar Visita',
    description: 'Agenda visitas e test-drives para clientes interessados',
    icon: Calendar,
    enabled: true,
    category: 'Agendamento',
  },
  {
    id: 'calculate_financing',
    name: 'Calcular Financiamento',
    description: 'Simula parcelas e valores de financiamento de veículos',
    icon: Calculator,
    enabled: true,
    category: 'Financeiro',
  },
  {
    id: 'transfer_to_human',
    name: 'Transferir para Humano',
    description: 'Transfere a conversa para um atendente quando necessário',
    icon: PhoneForwarded,
    enabled: true,
    category: 'Suporte',
  },
];

export default function AgentToolsPage() {
  const { agentId } = useParams();
  const navigate = useNavigate();
  
  const { data: agent, isLoading } = useAIAgent(agentId);

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-[400px]" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-3xl">
      <div className="flex items-center gap-4">
        <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
          <Wrench className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Ferramentas do Agente</h1>
          <p className="text-muted-foreground">
            Capacidades que o agente pode usar para ajudar os clientes
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Ferramentas Integradas</CardTitle>
          <CardDescription>
            Ferramentas pré-configuradas para integração com o sistema
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {BUILT_IN_TOOLS.map((tool) => (
            <div 
              key={tool.id}
              className="flex items-start gap-4 p-4 border rounded-lg hover:bg-muted/50 transition-colors"
            >
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                <tool.icon className="h-5 w-5 text-primary" />
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-medium">{tool.name}</h4>
                  <Badge variant="secondary" className="text-xs">{tool.category}</Badge>
                </div>
                <p className="text-sm text-muted-foreground">{tool.description}</p>
              </div>

              <div className="flex items-center gap-2">
                {tool.enabled && (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                )}
                <Switch checked={tool.enabled} disabled />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Comportamento de Ferramentas</CardTitle>
          <CardDescription>
            Como o agente decide quando usar cada ferramenta
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 border rounded-lg bg-muted/50">
            <h4 className="font-medium mb-2">Modo Automático (Recomendado)</h4>
            <p className="text-sm text-muted-foreground">
              O modelo de IA decide automaticamente quando usar cada ferramenta baseado no contexto da conversa. 
              Por exemplo, se o cliente perguntar sobre um carro específico, o agente usará a busca de veículos.
            </p>
          </div>
          
          <div className="p-4 border rounded-lg">
            <h4 className="font-medium mb-2">Prioridade de Ferramentas</h4>
            <p className="text-sm text-muted-foreground mb-3">
              As ferramentas são executadas na ordem de prioridade quando múltiplas são aplicáveis:
            </p>
            <ol className="list-decimal list-inside text-sm space-y-1 text-muted-foreground">
              <li>Buscar Veículos (para perguntas sobre estoque)</li>
              <li>Criar/Atualizar Lead (ao coletar dados de contato)</li>
              <li>Calcular Financiamento (para simulações)</li>
              <li>Agendar Visita (para marcar test-drives)</li>
              <li>Transferir para Humano (quando solicitado)</li>
            </ol>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={() => navigate(`/ai-agents/${agentId}/memoria`)}>
          Voltar
        </Button>
        <Button 
          onClick={() => navigate(`/ai-agents/${agentId}/implantacao`)}
          className="gap-2"
        >
          Continuar para Implantação
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
