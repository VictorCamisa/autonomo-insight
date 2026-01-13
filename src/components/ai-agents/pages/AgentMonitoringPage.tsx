import { useParams } from 'react-router-dom';
import { BarChart3, MessageSquare, Users, Clock, TrendingUp, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { useAIAgent } from '@/hooks/useAIAgents';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from 'recharts';

const conversationData = [
  { date: '01/01', conversations: 45, leads: 12 },
  { date: '02/01', conversations: 52, leads: 18 },
  { date: '03/01', conversations: 38, leads: 10 },
  { date: '04/01', conversations: 65, leads: 22 },
  { date: '05/01', conversations: 58, leads: 15 },
  { date: '06/01', conversations: 72, leads: 28 },
  { date: '07/01', conversations: 68, leads: 24 },
];

const toolUsageData = [
  { name: 'Buscar Veículos', calls: 156 },
  { name: 'Consultar Preço', calls: 98 },
  { name: 'Agendar Visita', calls: 45 },
  { name: 'Enviar Fotos', calls: 32 },
];

const recentConversations = [
  { id: '1', lead: 'João Silva', channel: 'WhatsApp', status: 'completed', score: 85, duration: '8 min' },
  { id: '2', lead: 'Maria Santos', channel: 'Widget', status: 'escalated', score: 45, duration: '12 min' },
  { id: '3', lead: 'Pedro Costa', channel: 'WhatsApp', status: 'completed', score: 92, duration: '5 min' },
  { id: '4', lead: 'Ana Oliveira', channel: 'API', status: 'active', score: null, duration: '3 min' },
];

export default function AgentMonitoringPage() {
  const { agentId } = useParams();
  const { data: agent, isLoading } = useAIAgent(agentId);

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <Skeleton className="h-[300px]" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-4">
        <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
          <BarChart3 className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Monitoramento</h1>
          <p className="text-muted-foreground">
            Métricas e performance do agente {agent?.name}
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Conversas Hoje</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">68</div>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <TrendingUp className="h-3 w-3 text-green-500" />
              +12% vs ontem
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Leads Qualificados</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">24</div>
            <p className="text-xs text-muted-foreground">
              Taxa de conversão: 35%
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Tempo Médio</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">6.2 min</div>
            <p className="text-xs text-muted-foreground">
              Resposta: 1.2s
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Score Médio</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">78</div>
            <p className="text-xs text-muted-foreground">
              Qualidade das conversas
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Conversas por Dia</CardTitle>
            <CardDescription>Últimos 7 dias</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={conversationData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="date" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="conversations"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  name="Conversas"
                />
                <Line
                  type="monotone"
                  dataKey="leads"
                  stroke="hsl(var(--chart-2))"
                  strokeWidth={2}
                  name="Leads"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Uso de Ferramentas</CardTitle>
            <CardDescription>Chamadas por ferramenta</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={toolUsageData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis type="number" className="text-xs" />
                <YAxis dataKey="name" type="category" className="text-xs" width={100} />
                <Tooltip />
                <Bar dataKey="calls" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Recent Conversations */}
      <Card>
        <CardHeader>
          <CardTitle>Conversas Recentes</CardTitle>
          <CardDescription>Últimas interações do agente</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {recentConversations.map((conv) => (
              <div
                key={conv.id}
                className="flex items-center justify-between p-3 border rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-sm font-medium">
                      {conv.lead.split(' ').map(n => n[0]).join('')}
                    </span>
                  </div>
                  <div>
                    <div className="font-medium">{conv.lead}</div>
                    <div className="text-sm text-muted-foreground">{conv.channel}</div>
                  </div>
                </div>
                
                <div className="flex items-center gap-4">
                  <span className="text-sm text-muted-foreground">{conv.duration}</span>
                  {conv.score && (
                    <Badge variant={conv.score >= 70 ? 'default' : 'secondary'}>
                      Score: {conv.score}
                    </Badge>
                  )}
                  <Badge
                    variant={
                      conv.status === 'completed' ? 'default' :
                      conv.status === 'escalated' ? 'destructive' :
                      'outline'
                    }
                  >
                    {conv.status === 'completed' ? 'Concluída' :
                     conv.status === 'escalated' ? 'Escalada' :
                     'Ativa'}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
