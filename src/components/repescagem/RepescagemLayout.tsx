import { Outlet } from 'react-router-dom';
import { ModuleHeader } from '@/components/layout/ModuleHeader';
import { Sparkles, LayoutDashboard, Layers, History, UserCheck } from 'lucide-react';

const navItems = [
  { path: '/repescagem', label: 'Visão Geral', icon: <LayoutDashboard className="h-4 w-4" /> },
  { path: '/repescagem/campanhas', label: 'Campanhas', icon: <Layers className="h-4 w-4" /> },
  { path: '/repescagem/leads', label: 'Leads em Repescagem', icon: <UserCheck className="h-4 w-4" /> },
  { path: '/repescagem/historico', label: 'Histórico', icon: <History className="h-4 w-4" /> },
];

export function RepescagemLayout() {
  return (
    <div>
      <ModuleHeader
        icon={Sparkles}
        title="Repescagem"
        description="IA reaviva conversas paradas automaticamente"
        basePath="/repescagem"
        navItems={navItems}
      />
      <Outlet />
    </div>
  );
}
