import { Outlet } from 'react-router-dom';
import { ModuleHeader } from '@/components/layout/ModuleHeader';
import {
  ShoppingCart,
  LayoutDashboard,
  CheckSquare,
  List,
  Users,
  TrendingUp,
  FileText,
} from 'lucide-react';

const navItems = [
  { path: '/vendas', label: 'Dashboard', icon: <LayoutDashboard className="h-4 w-4" /> },
  { path: '/vendas/aprovacoes', label: 'Aprovações', icon: <CheckSquare className="h-4 w-4" /> },
  { path: '/vendas/vendas', label: 'Vendas', icon: <List className="h-4 w-4" /> },
  { path: '/vendas/equipe', label: 'Equipe', icon: <Users className="h-4 w-4" /> },
  { path: '/vendas/lucro', label: 'Lucro', icon: <TrendingUp className="h-4 w-4" /> },
  { path: '/vendas/contratos', label: 'Contratos', icon: <FileText className="h-4 w-4" /> },
];

export function SalesLayout() {
  return (
    <div>
      <ModuleHeader
        icon={ShoppingCart}
        title="Vendas"
        description="Gerencie vendas, aprovações e equipe"
        basePath="/vendas"
        navItems={navItems}
      />
      <Outlet />
    </div>
  );
}
