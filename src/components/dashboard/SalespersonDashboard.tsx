import { useAuth } from '@/contexts/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { BentoCard } from '@/components/ui/bento-card';
import { useLeads } from '@/hooks/useLeads';
import { useNegotiations } from '@/hooks/useNegotiations';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  Users,
  Target,
  Wallet,
  ArrowRight,
  UserPlus,
  Calendar,
  MessageSquare,
  Clock,
  CheckCircle2,
  TrendingUp,
} from 'lucide-react';
import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { differenceInDays, format, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

export function SalespersonDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const userId = user?.id;

  // Leads atribuídos ao vendedor
  const { data: leads, isLoading: loadingLeads } = useLeads();
  const { data: negotiations, isLoading: loadingNegotiations } = useNegotiations();

  // Comissões do vendedor no mês atual
  const { data: commissions, isLoading: loadingCommissions } = useQuery({
    queryKey: ['my-commissions', userId],
    queryFn: async () => {
      if (!userId) return { pending: 0, paid: 0, total: 0 };
      
      const start = startOfMonth(new Date()).toISOString();
      const end = endOfMonth(new Date()).toISOString();

      const { data, error } = await supabase
        .from('sale_commissions')
        .select('final_amount, status, paid')
        .eq('user_id', userId)
        .gte('created_at', start)
        .lte('created_at', end);

      if (error) {
        console.error('Error fetching commissions:', error);
        return { pending: 0, paid: 0, total: 0 };
      }

      const pending = (data ?? []).filter(c => !c.paid).reduce((sum, c) => sum + (c.final_amount || 0), 0);
      const paid = (data ?? []).filter(c => c.paid).reduce((sum, c) => sum + (c.final_amount || 0), 0);

      return { pending, paid, total: pending + paid };
    },
    enabled: !!userId,
  });

  const isLoading = loadingLeads || loadingNegotiations || loadingCommissions;

  // Métricas do vendedor
  const metrics = useMemo(() => {
    const now = new Date();
    
    // Leads atribuídos ao vendedor
    const myLeads = leads?.filter(l => l.assigned_to === userId) || [];
    const activeLeads = myLeads.filter(l => l.status !== 'convertido' && l.status !== 'perdido');
    const leadsNeedingResponse = activeLeads.filter(l => {
      const daysSinceUpdate = differenceInDays(now, new Date(l.updated_at));
      return daysSinceUpdate > 2;
    });

    // Negociações do vendedor
    const myNegotiations = negotiations?.filter(n => n.salesperson_id === userId) || [];
    const activeNegotiations = myNegotiations.filter(n => 
      n.status === 'atendimento_ia' || n.status === 'negociando' || n.status === 'follow_up'
    );
    const wonThisMonth = myNegotiations.filter(n => {
      if (n.status !== 'ganho') return false;
      const closeDate = n.actual_close_date ? new Date(n.actual_close_date) : null;
      if (!closeDate) return false;
      return closeDate >= startOfMonth(now) && closeDate <= endOfMonth(now);
    });

    // Próximos agendamentos
    const upcomingAppointments = myNegotiations.filter(n => {
      if (!n.appointment_date) return false;
      const appointmentDate = new Date(n.appointment_date);
      return appointmentDate >= now && differenceInDays(appointmentDate, now) <= 7;
    }).length;

    return {
      totalLeads: activeLeads.length,
      leadsNeedingResponse: leadsNeedingResponse.length,
      activeNegotiations: activeNegotiations.length,
      wonThisMonth: wonThisMonth.length,
      upcomingAppointments,
    };
  }, [leads, negotiations, userId]);

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
        </div>
        <div className="grid gap-5 grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
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
            {greeting}, {user?.user_metadata?.full_name?.split(' ')[0] || 'Vendedor'}
          </h1>
          <p className="text-muted-foreground">
            Aqui está o resumo do seu dia.
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => navigate('/crm')}
            className="gap-2"
          >
            <Target className="h-4 w-4" />
            Ver CRM
          </Button>
          <Button 
            size="sm" 
            onClick={() => navigate('/crm/leads')}
            className="gap-2"
          >
            <UserPlus className="h-4 w-4" />
            Novo Lead
          </Button>
        </div>
      </motion.div>

      {/* KPIs */}
      <div className="grid gap-5 grid-cols-2 lg:grid-cols-4">
        <BentoCard
          title="Meus Leads"
          value={metrics.totalLeads.toString()}
          subtitle={`${metrics.leadsNeedingResponse} aguardando retorno`}
          colors={["#E53935", "#EF5350", "#E57373"]}
          delay={0}
          icon={<Users className="h-5 w-5 text-primary" />}
        />
        <BentoCard
          title="Negociações Ativas"
          value={metrics.activeNegotiations.toString()}
          subtitle={`${metrics.wonThisMonth} ganhas este mês`}
          colors={["#B71C1C", "#C62828", "#D32F2F"]}
          delay={0.1}
          icon={<Target className="h-5 w-5 text-primary" />}
        />
        <BentoCard
          title="Comissões do Mês"
          value={formatCurrency(commissions?.total || 0)}
          subtitle={`${formatCurrency(commissions?.pending || 0)} pendentes`}
          colors={["#D32F2F", "#E53935", "#EF5350"]}
          delay={0.2}
          icon={<Wallet className="h-5 w-5 text-primary" />}
        />
        <BentoCard
          title="Agendamentos"
          value={metrics.upcomingAppointments.toString()}
          subtitle="próximos 7 dias"
          colors={["#C62828", "#D32F2F", "#E53935"]}
          delay={0.3}
          icon={<Calendar className="h-5 w-5 text-primary" />}
        />
      </div>

      {/* Ações Rápidas */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate('/crm')}>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base font-medium">
              <div className="p-2 rounded-lg bg-primary/10">
                <Target className="h-4 w-4 text-primary" />
              </div>
              Pipeline de Vendas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-3">
              Gerencie suas negociações e acompanhe o funil de vendas.
            </p>
            <Button variant="ghost" size="sm" className="gap-2 px-0 hover:px-2">
              Acessar CRM <ArrowRight className="h-4 w-4" />
            </Button>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate('/estoque')}>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base font-medium">
              <div className="p-2 rounded-lg bg-primary/10">
                <TrendingUp className="h-4 w-4 text-primary" />
              </div>
              Estoque de Veículos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-3">
              Consulte os veículos disponíveis para venda.
            </p>
            <Button variant="ghost" size="sm" className="gap-2 px-0 hover:px-2">
              Ver Estoque <ArrowRight className="h-4 w-4" />
            </Button>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate('/comissoes')}>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base font-medium">
              <div className="p-2 rounded-lg bg-primary/10">
                <Wallet className="h-4 w-4 text-primary" />
              </div>
              Minhas Comissões
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-3">
              Acompanhe suas comissões e metas do mês.
            </p>
            <Button variant="ghost" size="sm" className="gap-2 px-0 hover:px-2">
              Ver Comissões <ArrowRight className="h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Alertas */}
      {metrics.leadsNeedingResponse > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card className="border-amber-200 bg-amber-50/50 dark:border-amber-900 dark:bg-amber-950/20">
            <CardContent className="flex items-center gap-4 py-4">
              <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/50">
                <Clock className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-amber-900 dark:text-amber-100">
                  {metrics.leadsNeedingResponse} lead{metrics.leadsNeedingResponse > 1 ? 's' : ''} aguardando retorno
                </p>
                <p className="text-sm text-amber-700 dark:text-amber-300">
                  Leads sem atualização há mais de 48 horas
                </p>
              </div>
              <Button 
                variant="outline" 
                size="sm"
                className="border-amber-300 text-amber-700 hover:bg-amber-100 dark:border-amber-700 dark:text-amber-300 dark:hover:bg-amber-900/50"
                onClick={() => navigate('/crm/leads')}
              >
                Ver Leads
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  );
}