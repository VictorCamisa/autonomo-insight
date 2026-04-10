import { Outlet } from 'react-router-dom';
import { ModuleHeader } from '@/components/layout/ModuleHeader';
import {
  Users,
  LayoutDashboard,
  Contact,
  MessageSquare,
  BarChart3,
} from 'lucide-react';

const navItems = [
  { path: '/crm', label: 'Pipeline', icon: <LayoutDashboard className="h-4 w-4" /> },
  { path: '/crm/contatos', label: 'Contatos', icon: <Contact className="h-4 w-4" /> },
  
  { path: '/crm/analytics', label: 'Análises', icon: <BarChart3 className="h-4 w-4" /> },
];

export function CRMLayout() {
  return (
    <div>
      <ModuleHeader
        icon={Users}
        title="CRM"
        description="Gerencie leads e negociações"
        basePath="/crm"
        navItems={navItems}
      />
      <Outlet />
    </div>
  );
}
