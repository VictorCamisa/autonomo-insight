import { useAuth } from '@/contexts/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import { BentoCard } from '@/components/ui/bento-card';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SalespersonDashboard } from '@/components/dashboard/SalespersonDashboard';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  useFinancialDashboard, 
  useDREData, 
  useFinancialAlerts 
} from '@/hooks/useFinancial';
import { useLeads } from '@/hooks/useLeads';
import { useVehicles } from '@/hooks/useVehicles';
import { useSalesTeamMetrics } from '@/hooks/useSalesTeamMetrics';
import {
  Users,
  Package,
  Clock,
  Target,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  DollarSign,
  ShoppingCart,
  ArrowRight,
  Car,
  UserPlus,
  FileText,
  Calendar,
  Activity,
  Wallet,
  PiggyBank,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Timer,
  Percent,
  BarChart3,
  Eye,
  MessageSquare,
  Phone,
} from 'lucide-react';
import { useMemo } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  Legend,
} from 'recharts';
import { motion } from 'framer-motion';
import { differenceInDays, subDays, isAfter, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// Helper functions
const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

const formatCurrencyShort = (value: number) => {
  if (value >= 1000000) {
    return `R$ ${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `R$ ${(value / 1000).toFixed(0)}k`;
  }
  return formatCurrency(value);
};

const formatPercent = (value: number) => `${value.toFixed(1)}%`;

// Chart colors
const CHART_COLORS = {
  primary: 'hsl(0, 73%, 55%)',
  success: 'hsl(0, 73%, 55%)',
  warning: 'hsl(0, 73%, 55%)',
  danger: 'hsl(0, 73%, 45%)',
  muted: 'hsl(0, 0%, 50%)',
  blue: '#E53935',
  emerald: '#D32F2F',
  violet: '#C62828',
  amber: '#B71C1C',
  rose: '#EF5350',
  cyan: '#E57373',
};

const PIE_COLORS = ['#E53935', '#D32F2F', '#C62828', '#B71C1C', '#EF5350', '#E57373'];

export default function Dashboard() {
  const { user, role } = useAuth();
  const navigate = useNavigate();
  
  // Se for vendedor, mostra dashboard simplificado
  if (role === 'vendedor') {
    return <SalespersonDashboard />;
  }
  // Fetch all data
  const { kpis, isLoading: loadingKpis, vehicleDRE, negotiations, profitReports } = useFinancialDashboard();
  const { dreData, isLoading: loadingDRE } = useDREData(6);
  const alerts = useFinancialAlerts();
  const { data: leads, isLoading: loadingLeads } = useLeads();
  const { data: vehicles, isLoading: loadingVehicles } = useVehicles();
  const { data: teamMetrics, isLoading: loadingTeam } = useSalesTeamMetrics();

  const isLoading = loadingKpis || loadingDRE || loadingLeads || loadingVehicles || loadingTeam;

  // Compute additional metrics
  const dashboardMetrics = useMemo(() => {
    const now = new Date();
    const thirtyDaysAgo = subDays(now, 30);
    
    // Leads metrics
    const activeLeads = leads?.filter(l => l.status !== 'convertido' && l.status !== 'perdido') || [];
    const newLeadsThisMonth = leads?.filter(l => isAfter(new Date(l.created_at), thirtyDaysAgo)) || [];
    const leadsAguardandoRetorno = activeLeads.filter(l => {
      const daysSinceUpdate = differenceInDays(now, new Date(l.updated_at));
      return daysSinceUpdate > 2;
    });
    
    // Vehicles metrics
    const vehiclesInStock = vehicles?.filter(v => v.status === 'disponivel') || [];
    const vehiclesParados = vehiclesInStock.filter(v => {
      const daysInStock = v.purchase_date 
        ? differenceInDays(now, new Date(v.purchase_date)) 
        : 0;
      return daysInStock > 45;
    });
    
    // Negotiations by status (novos status do pipeline)
    const negotiationsByStatus = {
      atendimento_ia: negotiations?.filter(n => n.status === 'atendimento_ia').length || 0,
      negociando: negotiations?.filter(n => n.status === 'negociando').length || 0,
      ganho: negotiations?.filter(n => n.status === 'ganho').length || 0,
      follow_up: negotiations?.filter(n => n.status === 'follow_up').length || 0,
      perdido: negotiations?.filter(n => n.status === 'perdido').length || 0,
    };
    
    // Lead sources distribution
    const leadSources = leads?.reduce((acc, lead) => {
      const source = lead.source || 'outro';
      acc[source] = (acc[source] || 0) + 1;
      return acc;
    }, {} as Record<string, number>) || {};
    
    const leadSourceData = Object.entries(leadSources).map(([name, value]) => ({
      name: getLeadSourceLabel(name),
      value,
    })).sort((a, b) => b.value - a.value).slice(0, 6);

    // Top salespeople (use snake_case properties)
    const topSalespeople = teamMetrics
      ?.filter(m => m.total_revenue > 0)
      ?.sort((a, b) => b.total_revenue - a.total_revenue)
      ?.slice(0, 5) || [];
    
    return {
      activeLeads: activeLeads.length,
      newLeadsThisMonth: newLeadsThisMonth.length,
      leadsAguardandoRetorno: leadsAguardandoRetorno.length,
      vehiclesInStock: vehiclesInStock.length,
      vehiclesParados: vehiclesParados.length,
      negotiationsByStatus,
      leadSourceData,
      topSalespeople,
      totalNegotiations: negotiations?.length || 0,
      activeNegotiations: (negotiationsByStatus.atendimento_ia + negotiationsByStatus.negociando + negotiationsByStatus.follow_up),
    };
  }, [leads, vehicles, negotiations, teamMetrics]);

  // Build smart alerts
  const smartAlerts = useMemo(() => {
    const alertList: Array<{
      id: string;
      message: string;
      type: 'urgent' | 'warning' | 'info' | 'success';
      link?: string;
      icon: React.ReactNode;
    }> = [];

    // Urgent: Leads waiting for response
    if (dashboardMetrics.leadsAguardandoRetorno > 0) {
      alertList.push({
        id: 'leads-waiting',
        message: `${dashboardMetrics.leadsAguardandoRetorno} lead${dashboardMetrics.leadsAguardandoRetorno > 1 ? 's' : ''} aguardando retorno há mais de 48h`,
        type: 'urgent',
        link: '/leads',
        icon: <AlertCircle className="h-4 w-4" />,
      });
    }

    // Warning: Vehicles stuck in inventory
    if (dashboardMetrics.vehiclesParados > 0) {
      alertList.push({
        id: 'vehicles-stuck',
        message: `${dashboardMetrics.vehiclesParados} veículo${dashboardMetrics.vehiclesParados > 1 ? 's' : ''} há mais de 45 dias em estoque`,
        type: 'warning',
        link: '/estoque',
        icon: <Clock className="h-4 w-4" />,
      });
    }

    // Info: Pending commissions
    if (kpis?.pendingCommissions && kpis.pendingCommissions > 0) {
      alertList.push({
        id: 'pending-commissions',
        message: `${formatCurrency(kpis.pendingCommissions)} em comissões pendentes`,
        type: 'info',
        link: '/vendas',
        icon: <Wallet className="h-4 w-4" />,
      });
    }

    // Success: Sales this month
    if (kpis?.thisMonthSalesCount && kpis.thisMonthSalesCount > 0) {
      alertList.push({
        id: 'month-sales',
        message: `${kpis.thisMonthSalesCount} venda${kpis.thisMonthSalesCount > 1 ? 's' : ''} realizada${kpis.thisMonthSalesCount > 1 ? 's' : ''} este mês`,
        type: 'success',
        link: '/vendas',
        icon: <CheckCircle2 className="h-4 w-4" />,
      });
    }

    // Low margin alert
    if (kpis?.avgMargin && kpis.avgMargin < 10) {
      alertList.push({
        id: 'low-margin',
        message: `Margem média atual de ${formatPercent(kpis.avgMargin)} está abaixo do ideal`,
        type: 'warning',
        link: '/financeiro',
        icon: <TrendingDown className="h-4 w-4" />,
      });
    }

    return alertList;
  }, [dashboardMetrics, kpis]);

  // Chart data for revenue trend
  const revenueTrendData = useMemo(() => {
    return dreData?.map(d => ({
      name: d.period,
      receita: d.receitaBruta,
      lucro: d.lucroLiquido,
    })) || [];
  }, [dreData]);

  // Negotiations funnel data
  const funnelData = useMemo(() => {
    return [
      { name: 'Atend. IA', value: dashboardMetrics.negotiationsByStatus.atendimento_ia, color: CHART_COLORS.blue },
      { name: 'Negociando', value: dashboardMetrics.negotiationsByStatus.negociando, color: CHART_COLORS.amber },
      { name: 'Ganhas', value: dashboardMetrics.negotiationsByStatus.ganho, color: CHART_COLORS.emerald },
      { name: 'Follow-up', value: dashboardMetrics.negotiationsByStatus.follow_up, color: CHART_COLORS.violet },
      { name: 'Perdidas', value: dashboardMetrics.negotiationsByStatus.perdido, color: CHART_COLORS.rose },
    ];
  }, [dashboardMetrics.negotiationsByStatus]);

  // Get greeting based on time of day
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Bom dia';
    if (hour < 18) return 'Boa tarde';
    return 'Boa noite';
  }, []);

  if (isLoading) {
    return (
      <div className="space-y-8 p-1">
        <div className="space-y-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-48" />
        </div>
        <div className="grid gap-5 grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
        <div className="grid gap-5 lg:grid-cols-3">
          <Skeleton className="h-80 lg:col-span-2 rounded-xl" />
          <Skeleton className="h-80 rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.div 
        className="flex flex-col sm:flex-row sm:items-end justify-between gap-4"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">
            {format(new Date(), "EEEE, d 'de' MMMM", { locale: ptBR })}
          </p>
          <h1 className="text-2xl font-semibold text-foreground/90">
            {greeting}, {user?.user_metadata?.full_name?.split(' ')[0] || 'Usuário'}
          </h1>
          <p className="text-muted-foreground">
            Aqui está o resumo da sua loja hoje.
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => navigate('/estoque')}
            className="gap-2"
          >
            <Car className="h-4 w-4" />
            Novo Veículo
          </Button>
          <Button 
            size="sm" 
            onClick={() => navigate('/leads')}
            className="gap-2"
          >
            <UserPlus className="h-4 w-4" />
            Novo Lead
          </Button>
        </div>
      </motion.div>

      {/* Primary KPIs */}
      <div className="grid gap-5 grid-cols-2 lg:grid-cols-4">
        <BentoCard
          title="Faturamento do Mês"
          value={formatCurrencyShort(kpis?.thisMonthRevenue || 0)}
          subtitle={`${kpis?.thisMonthSalesCount || 0} vendas realizadas`}
          colors={["#E53935", "#EF5350", "#E57373"]}
          delay={0}
          icon={<DollarSign className="h-5 w-5 text-primary" />}
        />
        <BentoCard
          title="Lucro Líquido"
          value={formatCurrencyShort(kpis?.thisMonthProfit || 0)}
          subtitle={`Margem: ${formatPercent(kpis?.avgMargin || 0)}`}
          colors={["#B71C1C", "#C62828", "#D32F2F"]}
          delay={0.1}
          icon={<TrendingUp className="h-5 w-5 text-primary" />}
        />
        <BentoCard
          title="Veículos em Estoque"
          value={dashboardMetrics.vehiclesInStock.toString()}
          subtitle={`${formatCurrencyShort(kpis?.totalStockValue || 0)} investidos`}
          colors={["#D32F2F", "#E53935", "#EF5350"]}
          delay={0.2}
          icon={<Package className="h-5 w-5 text-primary" />}
        />
        <BentoCard
          title="Pipeline Ativo"
          value={formatCurrencyShort(kpis?.weightedPipeline || 0)}
          subtitle={`${dashboardMetrics.activeNegotiations} negociações ativas`}
          colors={["#C62828", "#D32F2F", "#E53935"]}
          delay={0.3}
          icon={<Target className="h-5 w-5 text-primary" />}
        />
      </div>

      {/* Secondary Stats Row */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
        <StatCard
          icon={<Users className="h-4 w-4" />}
          label="Leads Ativos"
          value={dashboardMetrics.activeLeads}
          trend={dashboardMetrics.newLeadsThisMonth}
          trendLabel="novos este mês"
          color="blue"
        />
        <StatCard
          icon={<Activity className="h-4 w-4" />}
          label="Negociações Ativas"
          value={dashboardMetrics.activeNegotiations}
          trend={dashboardMetrics.totalNegotiations}
          trendLabel="total"
          color="violet"
        />
        <StatCard
          icon={<Timer className="h-4 w-4" />}
          label="Média Dias Estoque"
          value={Math.round(kpis?.avgDaysInStock || 0)}
          trendLabel="dias"
          color="amber"
        />
        <StatCard
          icon={<Wallet className="h-4 w-4" />}
          label="Comissões Pendentes"
          value={formatCurrencyShort(kpis?.pendingCommissions || 0)}
          color="rose"
        />
      </div>

      {/* Charts Row */}
      <div className="grid gap-5 lg:grid-cols-3">
        {/* Revenue Trend Chart */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2.5 text-base font-medium">
              <div className="p-1.5 rounded-lg bg-primary/10">
                <BarChart3 className="h-4 w-4 text-primary" />
              </div>
              Evolução de Faturamento e Lucro
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={revenueTrendData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorReceita" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={CHART_COLORS.blue} stopOpacity={0.2}/>
                      <stop offset="95%" stopColor={CHART_COLORS.blue} stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorLucro" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={CHART_COLORS.emerald} stopOpacity={0.2}/>
                      <stop offset="95%" stopColor={CHART_COLORS.emerald} stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border/40" />
                  <XAxis dataKey="name" className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                  <YAxis 
                    tickFormatter={(value) => formatCurrencyShort(value)} 
                    className="text-xs" 
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                    width={70}
                  />
                  <Tooltip 
                    formatter={(value: number, name: string) => [
                      formatCurrency(value), 
                      name === 'receita' ? 'Faturamento' : 'Lucro'
                    ]}
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="receita"
                    stroke={CHART_COLORS.blue}
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorReceita)"
                    name="receita"
                  />
                  <Area
                    type="monotone"
                    dataKey="lucro"
                    stroke={CHART_COLORS.emerald}
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorLucro)"
                    name="lucro"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-center gap-6 mt-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: CHART_COLORS.blue }} />
                <span className="text-sm text-muted-foreground">Faturamento</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: CHART_COLORS.emerald }} />
                <span className="text-sm text-muted-foreground">Lucro</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Lead Sources Pie Chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2.5 text-base font-medium">
              <div className="p-1.5 rounded-lg bg-primary/10">
                <Users className="h-4 w-4 text-primary" />
              </div>
              Origem dos Leads
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={dashboardMetrics.leadSourceData}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={70}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {dashboardMetrics.leadSourceData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value: number) => [value, 'Leads']}
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-wrap justify-center gap-x-4 gap-y-1">
              {dashboardMetrics.leadSourceData.slice(0, 4).map((source, index) => (
                <div key={source.name} className="flex items-center gap-1.5">
                  <div 
                    className="w-2 h-2 rounded-full" 
                    style={{ backgroundColor: PIE_COLORS[index % PIE_COLORS.length] }} 
                  />
                  <span className="text-xs text-muted-foreground">{source.name}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alerts and Actions Row */}
      <div className="grid gap-5 lg:grid-cols-3">
        {/* Alerts */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2.5 text-base font-medium">
              <div className="p-1.5 rounded-lg bg-primary/10">
                <AlertTriangle className="h-4 w-4 text-primary" />
              </div>
              Alertas e Pendências
              {smartAlerts.length > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {smartAlerts.length}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {smartAlerts.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <CheckCircle2 className="h-10 w-10 mx-auto mb-3 text-success/50" />
                <p className="text-sm">Nenhum alerta no momento</p>
                <p className="text-xs mt-1">Tudo sob controle!</p>
              </div>
            ) : (
              smartAlerts.map((alert) => (
                <motion.div
                  key={alert.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className={`p-4 rounded-lg border-l-[3px] text-sm leading-relaxed flex items-center justify-between gap-3 group cursor-pointer hover:shadow-sm transition-shadow ${
                    alert.type === 'urgent'
                      ? 'bg-destructive/5 border-l-destructive text-destructive/90'
                      : alert.type === 'warning'
                      ? 'bg-amber-50 dark:bg-amber-500/10 border-l-amber-400 text-amber-700 dark:text-amber-300'
                      : alert.type === 'success'
                      ? 'bg-emerald-50 dark:bg-emerald-500/10 border-l-emerald-400 text-emerald-700 dark:text-emerald-300'
                      : 'bg-blue-50 dark:bg-blue-500/10 border-l-blue-400 text-blue-700 dark:text-blue-300'
                  }`}
                  onClick={() => alert.link && navigate(alert.link)}
                >
                  <div className="flex items-center gap-3">
                    {alert.icon}
                    <span>{alert.message}</span>
                  </div>
                  {alert.link && (
                    <ArrowRight className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                  )}
                </motion.div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2.5 text-base font-medium">
              <div className="p-1.5 rounded-lg bg-primary/10">
                <Target className="h-4 w-4 text-primary" />
              </div>
              Ações Rápidas
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2.5">
            <QuickActionButton
              to="/estoque"
              icon={<Package className="h-4.5 w-4.5" />}
              label="Cadastrar Veículo"
              color="blue"
            />
            <QuickActionButton
              to="/leads"
              icon={<UserPlus className="h-4.5 w-4.5" />}
              label="Novo Lead"
              color="emerald"
            />
            <QuickActionButton
              to="/crm"
              icon={<Activity className="h-4.5 w-4.5" />}
              label="Ver Pipeline"
              color="violet"
            />
            <QuickActionButton
              to="/vendas"
              icon={<ShoppingCart className="h-4.5 w-4.5" />}
              label="Registrar Venda"
              color="amber"
            />
            <QuickActionButton
              to="/financeiro"
              icon={<BarChart3 className="h-4.5 w-4.5" />}
              label="Relatórios"
              color="cyan"
            />
          </CardContent>
        </Card>
      </div>

      {/* Bottom Row: Funnel and Top Salespeople */}
      <div className="grid gap-5 lg:grid-cols-2">
        {/* Negotiations Funnel */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2.5 text-base font-medium">
              <div className="p-1.5 rounded-lg bg-violet-500/10">
                <Activity className="h-4 w-4 text-violet-500" />
              </div>
              Funil de Negociações
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart 
                  data={funnelData} 
                  layout="vertical" 
                  margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} className="stroke-border/40" />
                  <XAxis type="number" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} />
                  <YAxis 
                    type="category" 
                    dataKey="name" 
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                    width={100}
                  />
                  <Tooltip 
                    formatter={(value: number) => [value, 'Negociações']}
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                  <Bar 
                    dataKey="value" 
                    radius={[0, 4, 4, 0]}
                  >
                    {funnelData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Top Salespeople */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2.5 text-base font-medium">
              <div className="p-1.5 rounded-lg bg-emerald-500/10">
                <TrendingUp className="h-4 w-4 text-emerald-500" />
              </div>
              Top Vendedores
            </CardTitle>
          </CardHeader>
          <CardContent>
            {dashboardMetrics.topSalespeople.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="h-10 w-10 mx-auto mb-3 opacity-50" />
                <p className="text-sm">Nenhuma venda registrada ainda</p>
              </div>
            ) : (
              <div className="space-y-3">
                {dashboardMetrics.topSalespeople.map((person, index) => (
                  <motion.div
                    key={person.user_id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                  >
                    <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold ${
                      index === 0 ? 'bg-amber-500/20 text-amber-600' :
                      index === 1 ? 'bg-slate-400/20 text-slate-500' :
                      index === 2 ? 'bg-orange-600/20 text-orange-600' :
                      'bg-muted text-muted-foreground'
                    }`}>
                      {index + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{person.full_name}</p>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span>{person.won_negotiations} vendas</span>
                        <span>•</span>
                        <span>{formatPercent(person.conversion_rate)} conversão</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                        {formatCurrencyShort(person.total_revenue)}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Role-specific notice */}
      {!role && (
        <Card className="border-amber-500/50 bg-amber-500/5">
          <CardContent className="py-4">
            <p className="text-sm text-amber-600 dark:text-amber-400">
              Seu usuário ainda não tem uma role atribuída. Peça ao gerente para configurar seu acesso.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Helper component: Stat Card
function StatCard({ 
  icon, 
  label, 
  value, 
  trend, 
  trendLabel
}: { 
  icon: React.ReactNode;
  label: string;
  value: string | number;
  trend?: number;
  trendLabel?: string;
  color?: string;
}) {
  return (
    <motion.div 
      className="p-4 rounded-xl bg-card border border-border/50 hover:shadow-sm transition-shadow"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="flex items-center gap-2 mb-2">
        <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
          {icon}
        </div>
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
      <p className="text-xl font-semibold">{value}</p>
      {(trend !== undefined || trendLabel) && (
        <p className="text-xs text-muted-foreground mt-1">
          {trend !== undefined && <span className="font-medium">{trend}</span>}
          {trend !== undefined && trendLabel && ' '}
          {trendLabel}
        </p>
      )}
    </motion.div>
  );
}

// Helper component: Quick Action Button
function QuickActionButton({ 
  to, 
  icon, 
  label
}: { 
  to: string; 
  icon: React.ReactNode; 
  label: string;
  color?: string;
}) {
  return (
    <Link 
      to={to}
      className="w-full flex items-center justify-between p-3.5 rounded-xl transition-colors group border bg-primary/5 dark:bg-primary/10 hover:bg-primary/10 dark:hover:bg-primary/15 border-primary/20 text-primary"
    >
      <div className="flex items-center gap-3">
        {icon}
        <span className="text-sm font-medium text-foreground">{label}</span>
      </div>
      <ArrowRight className="h-4 w-4 text-primary group-hover:translate-x-1 transition-transform" />
    </Link>
  );
}

// Helper function: Get lead source label
function getLeadSourceLabel(source: string): string {
  const labels: Record<string, string> = {
    site: 'Site',
    instagram: 'Instagram',
    facebook: 'Facebook',
    whatsapp: 'WhatsApp',
    indicacao: 'Indicação',
    loja: 'Loja',
    telefone: 'Telefone',
    olx: 'OLX',
    webmotors: 'Webmotors',
    icarros: 'iCarros',
    mercadolibre: 'Mercado Livre',
    outro: 'Outro',
  };
  return labels[source] || source;
}
