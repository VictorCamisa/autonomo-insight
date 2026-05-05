import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Wallet, Target, RefreshCw, TrendingUp, Trophy, Calculator, History, BarChart3 } from 'lucide-react';
import { NavLink } from 'react-router-dom';

const cards = [
  {
    title: 'Equipe',
    description: 'Gerencie vendedores, funções e acesso ao sistema',
    icon: Users,
    href: '/gestao-comercial/equipe',
    color: 'text-blue-400',
    bg: 'bg-blue-500/10',
    border: 'hover:border-blue-500/30',
  },
  {
    title: 'Round Robin',
    description: 'Distribuição automática e inteligente de leads entre vendedores',
    icon: RefreshCw,
    href: '/gestao-comercial/round-robin',
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
    border: 'hover:border-emerald-500/30',
  },
  {
    title: 'Comissões',
    description: 'Regras de comissionamento e painel de pagamentos',
    icon: Wallet,
    href: '/gestao-comercial/comissoes',
    color: 'text-amber-400',
    bg: 'bg-amber-500/10',
    border: 'hover:border-amber-500/30',
  },
  {
    title: 'Metas',
    description: 'Defina e acompanhe metas de vendas por vendedor e período',
    icon: Target,
    href: '/gestao-comercial/metas',
    color: 'text-purple-400',
    bg: 'bg-purple-500/10',
    border: 'hover:border-purple-500/30',
  },
  {
    title: 'Ranking',
    description: 'Performance comparativa da equipe comercial',
    icon: Trophy,
    href: '/gestao-comercial/ranking',
    color: 'text-orange-400',
    bg: 'bg-orange-500/10',
    border: 'hover:border-orange-500/30',
  },
  {
    title: 'Simulador',
    description: 'Simule comissões e projeções de remuneração variável',
    icon: Calculator,
    href: '/gestao-comercial/simulador',
    color: 'text-cyan-400',
    bg: 'bg-cyan-500/10',
    border: 'hover:border-cyan-500/30',
  },
  {
    title: 'Histórico',
    description: 'Registro completo de comissões e atribuições passadas',
    icon: History,
    href: '/gestao-comercial/historico',
    color: 'text-rose-400',
    bg: 'bg-rose-500/10',
    border: 'hover:border-rose-500/30',
  },
  {
    title: 'Métricas',
    description: 'KPIs e análises aprofundadas de desempenho comercial',
    icon: TrendingUp,
    href: '/gestao-comercial/metricas',
    color: 'text-primary',
    bg: 'bg-primary/10',
    border: 'hover:border-primary/30',
  },
];

export function GestaoComercialOverview() {
  return (
    <div className="py-6 space-y-6 animate-fade-in">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Gestão Comercial</h2>
        <p className="text-muted-foreground mt-1">
          Central de controle da operação: equipe, distribuição de leads, comissões e metas.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {cards.map((card) => (
          <NavLink key={card.href} to={card.href}>
            <Card className={`h-full transition-all duration-200 cursor-pointer group border-border/60 ${card.border} hover:shadow-card`}>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <div className={`p-2.5 rounded-xl ${card.bg} shrink-0`}>
                    <card.icon className={`h-5 w-5 ${card.color}`} />
                  </div>
                  <CardTitle className="text-sm font-semibold group-hover:text-primary transition-colors">
                    {card.title}
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground leading-relaxed">{card.description}</p>
              </CardContent>
            </Card>
          </NavLink>
        ))}
      </div>
    </div>
  );
}
