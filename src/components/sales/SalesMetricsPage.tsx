import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';
import { useSalesTeamMetrics, useTeamNegotiations } from '@/hooks/useSalesTeamMetrics';
import { useSales } from '@/hooks/useSales';
import { 
  TrendingUp, 
  Phone, 
  MessageCircle, 
  Target,
  BarChart3
} from 'lucide-react';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export function SalesMetricsPage() {
  const { data: teamMetrics } = useSalesTeamMetrics();
  const { data: negotiations } = useTeamNegotiations();
  const { data: sales } = useSales();

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { 
      style: 'currency', 
      currency: 'BRL',
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(value);
  };

  // Prepare chart data
  const revenueByPerson = teamMetrics?.map(m => ({
    name: m.full_name.split(' ')[0],
    receita: m.total_revenue,
    negociacoes: m.total_negotiations,
  })) || [];

  const interactionsByType = [
    { name: 'Ligações', value: teamMetrics?.reduce((sum, m) => sum + m.calls_count, 0) || 0 },
    { name: 'WhatsApp', value: teamMetrics?.reduce((sum, m) => sum + m.whatsapp_count, 0) || 0 },
    { name: 'E-mails', value: teamMetrics?.reduce((sum, m) => sum + m.emails_count, 0) || 0 },
    { name: 'Visitas', value: teamMetrics?.reduce((sum, m) => sum + m.visits_count, 0) || 0 },
  ].filter(i => i.value > 0);

  const negotiationsByStatus = [
    { name: 'Atendimento IA', value: negotiations?.filter(n => n.status === 'atendimento_ia').length || 0 },
    { name: 'Negociando', value: negotiations?.filter(n => n.status === 'negociando').length || 0 },
    { name: 'Ganhas', value: negotiations?.filter(n => n.status === 'ganho').length || 0 },
    { name: 'Perdidas', value: negotiations?.filter(n => n.status === 'perdido').length || 0 },
  ].filter(i => i.value > 0);

  return (
    <div className="space-y-6">
      {/* KPI Summary */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <Target className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Negociações</p>
                <p className="text-2xl font-bold">{negotiations?.length || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10">
                <TrendingUp className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Taxa Conversão Média</p>
                <p className="text-2xl font-bold">
                  {teamMetrics && teamMetrics.length > 0 
                    ? (teamMetrics.reduce((sum, m) => sum + m.conversion_rate, 0) / teamMetrics.length).toFixed(1)
                    : 0}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-500/10">
                <Phone className="h-5 w-5 text-purple-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Ligações</p>
                <p className="text-2xl font-bold">
                  {teamMetrics?.reduce((sum, m) => sum + m.calls_count, 0) || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/10">
                <MessageCircle className="h-5 w-5 text-emerald-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total WhatsApp</p>
                <p className="text-2xl font-bold">
                  {teamMetrics?.reduce((sum, m) => sum + m.whatsapp_count, 0) || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Revenue by Salesperson */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Faturamento por Vendedor
            </CardTitle>
          </CardHeader>
          <CardContent>
            {revenueByPerson.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={revenueByPerson}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="name" className="text-xs" />
                  <YAxis 
                    tickFormatter={(v) => formatCurrency(v)} 
                    className="text-xs"
                  />
                  <Tooltip 
                    formatter={(value: number) => formatCurrency(value)}
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))' 
                    }}
                  />
                  <Bar dataKey="receita" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                Sem dados para exibir
              </div>
            )}
          </CardContent>
        </Card>

        {/* Interactions by Type */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5" />
              Interações por Tipo
            </CardTitle>
          </CardHeader>
          <CardContent>
            {interactionsByType.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={interactionsByType}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {interactionsByType.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))' 
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                Sem dados para exibir
              </div>
            )}
          </CardContent>
        </Card>

        {/* Negotiations by Status */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Negociações por Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            {negotiationsByStatus.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={negotiationsByStatus} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis type="number" />
                  <YAxis dataKey="name" type="category" width={100} className="text-xs" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))' 
                    }}
                  />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                    {negotiationsByStatus.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                Sem dados para exibir
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
