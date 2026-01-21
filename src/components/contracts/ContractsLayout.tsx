import { Outlet } from 'react-router-dom';
import { ModuleHeader } from '@/components/layout/ModuleHeader';
import {
  FileText,
  LayoutDashboard,
  History,
  FileStack,
  Settings,
  FileSignature,
} from 'lucide-react';

const navItems = [
  { path: '/vendas/contratos', label: 'Contratos', icon: <LayoutDashboard className="h-4 w-4" /> },
  { path: '/vendas/contratos/assinaturas', label: 'Assinaturas', icon: <FileSignature className="h-4 w-4" /> },
  { path: '/vendas/contratos/historico', label: 'Histórico', icon: <History className="h-4 w-4" /> },
  { path: '/vendas/contratos/modelos', label: 'Modelos', icon: <FileStack className="h-4 w-4" /> },
  { path: '/vendas/contratos/configuracoes', label: 'Configurações', icon: <Settings className="h-4 w-4" /> },
];

export function ContractsLayout() {
  return (
    <div>
      <ModuleHeader
        icon={FileText}
        title="Contratos"
        description="Gerencie contratos, modelos e assinaturas"
        basePath="/vendas/contratos"
        navItems={navItems}
      />
      <Outlet />
    </div>
  );
}
