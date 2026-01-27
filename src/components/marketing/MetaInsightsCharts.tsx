import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { MetaInsight } from '@/types/meta-ads';
import { parseDate } from '@/lib/utils';

interface MetaInsightsChartsProps {
  dailyInsights: MetaInsight[];
  campaignInsights: MetaInsight[];
  isLoading: boolean;
}

const COLORS = ['#E53935', '#1E88E5', '#43A047', '#FB8C00', '#8E24AA', '#00ACC1', '#3949AB', '#D81B60'];

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', { 
    style: 'currency', 
    currency: 'BRL',
    notation: 'compact',
    maximumFractionDigits: 1
  }).format(value);
};

const formatNumber = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    notation: 'compact',
    maximumFractionDigits: 1
  }).format(value);
};

export default function MetaInsightsCharts({ dailyInsights, campaignInsights, isLoading }: MetaInsightsChartsProps) {
  // Prepare daily data for area chart
  const dailyData = useMemo(() => {
    return dailyInsights.map(insight => {
      const date = parseDate(insight.date_start);
      return {
        date: date ? format(date, 'dd/MM', { locale: ptBR }) : '-',
        fullDate: date ? format(date, 'dd MMM yyyy', { locale: ptBR }) : '-',
        spend: insight.spend,
        impressions: insight.impressions,
        clicks: insight.clicks,
        ctr: insight.ctr,
        reach: insight.reach,
      };
    });
  }, [dailyInsights]);

  // Prepare campaign data for bar chart
  const campaignData = useMemo(() => {
    return campaignInsights
      .slice(0, 10)
      .map(insight => ({
        name: insight.entity_id.substring(0, 8) + '...',
        spend: insight.spend,
        impressions: insight.impressions,
        clicks: insight.clicks,
        ctr: insight.ctr,
      }));
  }, [campaignInsights]);

  // Prepare pie chart data for spend distribution
  const spendDistribution = useMemo(() => {
    const total = campaignInsights.reduce((sum, c) => sum + c.spend, 0);
    return campaignInsights
      .slice(0, 6)
      .map((insight, index) => ({
        name: `Campanha ${index + 1}`,
        value: insight.spend,
        percentage: total > 0 ? ((insight.spend / total) * 100).toFixed(1) : '0',
      }));
  }, [campaignInsights]);

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-5 w-32" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-[250px] w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {/* Daily Spend Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-medium">Investimento Diário</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dailyData}>
                <defs>
                  <linearGradient id="spendGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#E53935" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#E53935" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis 
                  dataKey="date" 
                  tick={{ fontSize: 12 }}
                  className="text-muted-foreground"
                />
                <YAxis 
                  tick={{ fontSize: 12 }}
                  tickFormatter={formatCurrency}
                  className="text-muted-foreground"
                />
                <Tooltip 
                  formatter={(value: number) => [formatCurrency(value), 'Investimento']}
                  labelFormatter={(label, payload) => payload[0]?.payload?.fullDate || label}
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="spend"
                  stroke="#E53935"
                  strokeWidth={2}
                  fill="url(#spendGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Impressions vs Clicks Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-medium">Impressões vs Cliques</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dailyData}>
                <defs>
                  <linearGradient id="impressionsGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#1E88E5" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#1E88E5" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="clicksGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#43A047" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#43A047" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis 
                  dataKey="date" 
                  tick={{ fontSize: 12 }}
                />
                <YAxis 
                  yAxisId="left"
                  tick={{ fontSize: 12 }}
                  tickFormatter={formatNumber}
                />
                <YAxis 
                  yAxisId="right"
                  orientation="right"
                  tick={{ fontSize: 12 }}
                  tickFormatter={formatNumber}
                />
                <Tooltip 
                  formatter={(value: number, name: string) => [
                    formatNumber(value), 
                    name === 'impressions' ? 'Impressões' : 'Cliques'
                  ]}
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                />
                <Legend />
                <Area
                  yAxisId="left"
                  type="monotone"
                  dataKey="impressions"
                  name="Impressões"
                  stroke="#1E88E5"
                  strokeWidth={2}
                  fill="url(#impressionsGradient)"
                />
                <Area
                  yAxisId="right"
                  type="monotone"
                  dataKey="clicks"
                  name="Cliques"
                  stroke="#43A047"
                  strokeWidth={2}
                  fill="url(#clicksGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* CTR Over Time */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-medium">CTR ao Longo do Tempo</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dailyData}>
                <defs>
                  <linearGradient id="ctrGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8E24AA" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#8E24AA" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis 
                  dataKey="date" 
                  tick={{ fontSize: 12 }}
                />
                <YAxis 
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value) => `${value.toFixed(1)}%`}
                />
                <Tooltip 
                  formatter={(value: number) => [`${value.toFixed(2)}%`, 'CTR']}
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="ctr"
                  stroke="#8E24AA"
                  strokeWidth={2}
                  fill="url(#ctrGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Spend Distribution Pie Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-medium">Distribuição de Investimento</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={spendDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={2}
                  dataKey="value"
                  label={({ percentage }) => `${percentage}%`}
                  labelLine={false}
                >
                  {spendDistribution.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value: number) => [formatCurrency(value), 'Investimento']}
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
