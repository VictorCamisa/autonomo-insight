import { NavLink, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { usePermissions } from '@/hooks/usePermissions';
import {
  LayoutDashboard,
  Users,
  Car,
  ShoppingCart,
  DollarSign,
  Megaphone,
  Coins,
  FileText,
  UsersRound,
  Bot,
} from 'lucide-react';
import type { ModuleName } from '@/types/users';

interface NavItem {
  path: string;
  label: string;
  icon: React.ReactNode;
  requiredModule?: ModuleName;
}

const allNavItems: NavItem[] = [
  { path: '/dashboard', label: 'Dashboard', icon: <LayoutDashboard className="h-4 w-4" /> },
  { path: '/crm', label: 'CRM', icon: <Users className="h-4 w-4" />, requiredModule: 'crm' },
  { path: '/estoque', label: 'Estoque', icon: <Car className="h-4 w-4" />, requiredModule: 'estoque' },
  { path: '/vendas', label: 'Vendas', icon: <ShoppingCart className="h-4 w-4" />, requiredModule: 'vendas' },
  { path: '/comissoes', label: 'Comissões', icon: <Coins className="h-4 w-4" />, requiredModule: 'comissoes' },
  { path: '/financeiro', label: 'Financeiro', icon: <DollarSign className="h-4 w-4" />, requiredModule: 'financeiro' },
  { path: '/marketing', label: 'Marketing', icon: <Megaphone className="h-4 w-4" />, requiredModule: 'marketing' },
  { path: '/relatorios', label: 'Relatórios', icon: <FileText className="h-4 w-4" />, requiredModule: 'marketing' },
  { path: '/clientes', label: 'Clientes', icon: <UsersRound className="h-4 w-4" />, requiredModule: 'vendas' },
  { path: '/ai-agents', label: 'Agente IA', icon: <Bot className="h-4 w-4" /> },
];

interface MainNavProps {
  vertical?: boolean;
  onItemClick?: () => void;
}

export function MainNav({ vertical = false, onItemClick }: MainNavProps) {
  const location = useLocation();
  const { hasModuleAccess } = usePermissions();

  // Filtra itens baseado nas permissões do usuário
  const navItems = allNavItems.filter(item => {
    if (!item.requiredModule) return true; // Dashboard sempre visível
    return hasModuleAccess(item.requiredModule);
  });

  return (
    <nav className={cn(
      'flex gap-1',
      vertical ? 'flex-col' : 'items-center'
    )}>
      {navItems.map((item) => {
        const isActive = item.path === '/dashboard' 
          ? location.pathname === '/dashboard'
          : location.pathname.startsWith(item.path);
        
        return (
          <NavLink
            key={item.path}
            to={item.path}
            onClick={onItemClick}
            className={cn(
              'flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap',
              'hover:bg-accent hover:text-accent-foreground',
              isActive 
                ? 'bg-primary text-primary-foreground' 
                : 'text-muted-foreground'
            )}
          >
            {item.icon}
            <span className={vertical ? '' : 'hidden sm:inline'}>{item.label}</span>
          </NavLink>
        );
      })}
    </nav>
  );
}