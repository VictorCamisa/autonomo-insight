import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Clock, 
  RefreshCw, 
  CheckCircle, 
  XCircle, 
  TrendingUp,
  Users,
  MessageSquare,
  ArrowRight
} from 'lucide-react';
import { useFollowUpStats } from '@/hooks/useLeadFollowUpTracking';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export function ReactivationDashboard() {
  const { data: stats } = useFollowUpStats();

  // Buscar métricas de reativação dos últimos 30 dias
  const { data: reactivationMetrics } = useQuery({
    queryKey: ['reactivation-metrics'],
    queryFn: async () => {
      const thirtyDaysAgo = subDays(new Date(), 30).toISOString();

      // Total de trackings que foram reativados
      const { data: reactivated, count: reactivatedCount } = await supabase
        .from('lead_follow_up_tracking')
        .select('*', { count: 'exact', head: true })
        .gte('reactivated_count', 1)
        .gte('created_at', thirtyDaysAgo);

      // Total de trackings completados (sucesso)
      const { count: completedCount } = await supabase
        .from('lead_follow_up_tracking')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'completed')
        .gte('created_at', thirtyDaysAgo);

      // Total de trackings expirados (sem resposta)
      const { count: expiredCount } = await supabase
        .from('lead_follow_up_tracking')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'expired')
        .gte('created_at', thirtyDaysAgo);

      // Negociações que foram para ganho após follow-up
      const { data: winsAfterFollowUp } = await supabase
        .from('negotiations')
        .select('id')
        .eq('status', 'ganho')
        .gte('updated_at', thirtyDaysAgo);

      return {
        reactivated: reactivatedCount || 0,
        completed: completedCount || 0,
        expired: expiredCount || 0,
        winsAfterFollowUp: winsAfterFollowUp?.length || 0,
      };
    }
  });

  // Buscar histórico de reativações por dia
  const { data: dailyHistory } = useQuery({
    queryKey: ['reactivation-daily-history'],
    queryFn: async () => {
      const sevenDaysAgo = subDays(new Date(), 7).toISOString();

      const { data } = await supabase
        .from('lead_follow_up_tracking')
        .select('created_at, status, reactivated_count')
        .gte('created_at', sevenDaysAgo)
        .order('created_at', { ascending: true });

      // Agrupar por dia
      const byDay: Record<string, { started: number; reactivated: number; completed: number }> = {};
      
      data?.forEach(item => {
        const day = format(new Date(item.created_at), 'yyyy-MM-dd');
        if (!byDay[day]) {
          byDay[day] = { started: 0, reactivated: 0, completed: 0 };
        }
        byDay[day].started++;
        if (item.reactivated_count > 0) byDay[day].reactivated++;
        if (item.status === 'completed') byDay[day].completed++;
      });

      return Object.entries(byDay).map(([date, values]) => ({
        date,
        label: format(new Date(date), 'EEE', { locale: ptBR }),
        ...values
      }));
    }
  });

  const totalActive = stats?.active || 0;
  const totalCompleted = stats?.completed || 0;
  const successRate = totalActive + totalCompleted > 0 
    ? Math.round((totalCompleted / (totalActive + totalCompleted)) * 100)
    : 0;

  return (
    <div className="space-y-6">
      {/* KPIs Principais */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Em Follow-up</CardTitle>
            <Clock className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.active || 0}</div>
            <p className="text-xs text-muted-foreground">
              Leads aguardando resposta
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Reativados</CardTitle>
            <RefreshCw className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{reactivationMetrics?.reactivated || 0}</div>
            <p className="text-xs text-muted-foreground">
              Responderam ao follow-up
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Concluídos</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.completed || 0}</div>
            <p className="text-xs text-muted-foreground">
              Fluxo finalizado com sucesso
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taxa de Sucesso</CardTitle>
            <TrendingUp className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{successRate}%</div>
            <Progress value={successRate} className="mt-2" />
          </CardContent>
        </Card>
      </div>

      {/* Métricas de Conversão */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Funil de Reativação (30 dias)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-20 text-sm text-muted-foreground">Enviados</div>
              <div className="flex-1">
                <Progress value={100} className="h-3" />
              </div>
              <div className="w-12 text-right font-medium">
                {(stats?.active || 0) + (reactivationMetrics?.completed || 0) + (reactivationMetrics?.expired || 0)}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-20 text-sm text-muted-foreground">Reativados</div>
              <div className="flex-1">
                <Progress 
                  value={reactivationMetrics?.reactivated ? 
                    (reactivationMetrics.reactivated / ((stats?.active || 0) + (reactivationMetrics?.completed || 0) + (reactivationMetrics?.expired || 0))) * 100 
                    : 0
                  } 
                  className="h-3 bg-blue-100" 
                />
              </div>
              <div className="w-12 text-right font-medium">
                {reactivationMetrics?.reactivated || 0}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-20 text-sm text-muted-foreground">Vendas</div>
              <div className="flex-1">
                <Progress 
                  value={reactivationMetrics?.winsAfterFollowUp ? 
                    (reactivationMetrics.winsAfterFollowUp / ((stats?.active || 0) + (reactivationMetrics?.completed || 0) + (reactivationMetrics?.expired || 0))) * 100 
                    : 0
                  } 
                  className="h-3 bg-green-100" 
                />
              </div>
              <div className="w-12 text-right font-medium">
                {reactivationMetrics?.winsAfterFollowUp || 0}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Atividade (Últimos 7 dias)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {dailyHistory?.map((day) => (
                <div key={day.date} className="flex items-center gap-3">
                  <div className="w-12 text-sm text-muted-foreground capitalize">
                    {day.label}
                  </div>
                  <div className="flex-1 flex items-center gap-2">
                    <div 
                      className="h-2 bg-orange-400 rounded" 
                      style={{ width: `${Math.min(day.started * 10, 100)}%` }}
                    />
                    <div 
                      className="h-2 bg-blue-400 rounded" 
                      style={{ width: `${Math.min(day.reactivated * 15, 50)}%` }}
                    />
                    <div 
                      className="h-2 bg-green-400 rounded" 
                      style={{ width: `${Math.min(day.completed * 20, 30)}%` }}
                    />
                  </div>
                  <div className="w-16 text-right text-xs text-muted-foreground">
                    {day.started} iniciados
                  </div>
                </div>
              ))}
              {(!dailyHistory || dailyHistory.length === 0) && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Sem dados de atividade recente
                </p>
              )}
            </div>
            <div className="flex gap-4 mt-4 justify-center text-xs">
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-orange-400 rounded" />
                <span>Iniciados</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-blue-400 rounded" />
                <span>Reativados</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-green-400 rounded" />
                <span>Concluídos</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Status por Motivo de Perda */}
      <Card>
        <CardHeader>
          <CardTitle>Distribuição de Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
              <Clock className="h-3 w-3 mr-1" />
              Ativos: {stats?.active || 0}
            </Badge>
            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
              <CheckCircle className="h-3 w-3 mr-1" />
              Completados: {stats?.completed || 0}
            </Badge>
            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
              <RefreshCw className="h-3 w-3 mr-1" />
              Reativados: {stats?.reactivated || 0}
            </Badge>
            <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
              <XCircle className="h-3 w-3 mr-1" />
              Expirados: {reactivationMetrics?.expired || 0}
            </Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
