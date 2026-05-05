import { Outlet } from 'react-router-dom';
import { ModuleHeader } from '@/components/layout/ModuleHeader';
import {
  LayoutDashboard,
  Users,
  RefreshCw,
  Wallet,
  Target,
  BarChart3,
  History,
  Calculator,
  Trophy,
  Briefcase,
} from 'lucide-react';

const navItems = [
  { path: '/gestao-comercial', label: 'Visão Geral', icon: <LayoutDashboard className="h-4 w-4" /> },
  { path: '/gestao-comercial/equipe', label: 'Equipe', icon: <Users className="h-4 w-4" /> },
  { path: '/gestao-comercial/round-robin', label: 'Round Robin', icon: <RefreshCw className="h-4 w-4" /> },
  { path: '/gestao-comercial/comissoes', label: 'Comissões', icon: <Wallet className="h-4 w-4" /> },
  { path: '/gestao-comercial/metas', label: 'Metas', icon: <Target className="h-4 w-4" /> },
  { path: '/gestao-comercial/ranking', label: 'Ranking', icon: <Trophy className="h-4 w-4" /> },
  { path: '/gestao-comercial/historico', label: 'Histórico', icon: <History className="h-4 w-4" /> },
  { path: '/gestao-comercial/simulador', label: 'Simulador', icon: <Calculator className="h-4 w-4" /> },
  { path: '/gestao-comercial/metricas', label: 'Métricas', icon: <BarChart3 className="h-4 w-4" /> },
];

export function GestaoComercialLayout() {
  return (
    <div>
      <ModuleHeader
        icon={Briefcase}
        title="Gestão Comercial"
        description="Equipe, comissões, metas e distribuição de leads"
        basePath="/gestao-comercial"
        navItems={navItems}
      />
      <Outlet />
    </div>
  );
}
