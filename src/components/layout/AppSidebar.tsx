import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { usePermissions } from '@/hooks/usePermissions';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Car,
  LogOut,
  ChevronLeft,
  ChevronRight,
  ShoppingCart,
  Wallet,
  Receipt,
  TrendingUp,
  BarChart3,
  Target,
  FileText,
  Megaphone,
  Settings,
  MessageSquare,
  Bot,
  Sparkles,
} from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { NotificationBell } from '@/components/notifications/NotificationBell';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import logoMatheusVeiculos from '@/assets/logo-matheus-veiculos.png';
import type { ModuleName } from '@/types/users';

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  badge?: number;
  requiredModule?: ModuleName;
}

interface NavSection {
  title: string;
  items: NavItem[];
  requiredModules?: ModuleName[];
}

export function AppSidebar() {
  const { user, signOut } = useAuth();
  const { hasModuleAccess, isGerente, role } = usePermissions();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  // Definição de navegação - vendedor só vê Dashboard, CRM e Estoque
  const allSections: NavSection[] = [
    {
      title: 'Principal',
      items: [
        { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
        { label: 'CRM', href: '/crm', icon: Target, requiredModule: 'crm' },
        { label: 'Repescagem', href: '/repescagem', icon: Sparkles, requiredModule: 'crm' },
        { label: 'Estoque', href: '/estoque', icon: Car, requiredModule: 'estoque' },
        { label: 'Vendas', href: '/vendas', icon: ShoppingCart, requiredModule: 'vendas' },
      ],
    },
    {
      title: 'Financeiro',
      requiredModules: ['financeiro'],
      items: [
        { label: 'Lançamentos', href: '/financeiro/lancamentos', icon: Receipt, requiredModule: 'financeiro' },
        { label: 'Fluxo de Caixa', href: '/financeiro/fluxo-caixa', icon: TrendingUp, requiredModule: 'financeiro' },
        { label: 'DRE', href: '/financeiro/dre', icon: FileText, requiredModule: 'financeiro' },
        { label: 'Rentabilidade', href: '/financeiro/rentabilidade', icon: BarChart3, requiredModule: 'financeiro' },
      ],
    },
    {
      title: 'Gestão',
      requiredModules: ['marketing', 'configuracoes'],
      items: [
        { label: 'Comissões', href: '/comissoes', icon: Wallet, requiredModule: 'comissoes' },
        { label: 'Marketing', href: '/marketing', icon: Megaphone, requiredModule: 'marketing' },
        { label: 'Relatórios', href: '/relatorios', icon: FileText, requiredModule: 'marketing' },
        { label: 'WhatsApp', href: '/whatsapp', icon: MessageSquare, requiredModule: 'configuracoes' },
        { label: 'IA / Agentes', href: '/ia-agentes', icon: Bot, requiredModule: 'configuracoes' },
      ],
    },
  ];

  // Filtra seções e itens baseado nas permissões
  const sections = allSections
    .map(section => {
      // Se a seção inteira requer módulos específicos, verifica se tem acesso a pelo menos um
      if (section.requiredModules) {
        const hasAccess = section.requiredModules.some(mod => hasModuleAccess(mod));
        if (!hasAccess) return null;
      }

      // Filtra itens da seção
      const filteredItems = section.items.filter(item => {
        if (!item.requiredModule) return true;
        return hasModuleAccess(item.requiredModule);
      });

      if (filteredItems.length === 0) return null;

      return { ...section, items: filteredItems };
    })
    .filter(Boolean) as NavSection[];

  const isActive = (href: string) => {
    if (href === '/dashboard') return location.pathname === href;
    return location.pathname === href || location.pathname.startsWith(href + '/');
  };

  // Determina o label do role para exibição
  const getRoleLabel = () => {
    switch (role) {
      case 'gerente': return 'Gerente';
      case 'vendedor': return 'Vendedor';
      case 'marketing': return 'Marketing';
      default: return 'Usuário';
    }
  };

  const NavItemComponent = ({ item }: { item: NavItem }) => {
    const active = isActive(item.href);
    
    const linkContent = (
      <NavLink
        to={item.href}
        className={cn(
          'group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200',
          'hover:bg-sidebar-accent',
          active
            ? 'bg-sidebar-primary text-sidebar-primary-foreground shadow-sm'
            : 'text-sidebar-foreground hover:text-sidebar-accent-foreground'
        )}
      >
        <item.icon
          className={cn(
            'h-5 w-5 flex-shrink-0 transition-colors',
            active ? 'text-sidebar-primary-foreground' : 'text-sidebar-foreground/70 group-hover:text-sidebar-accent-foreground'
          )}
        />
        {!collapsed && <span className="truncate">{item.label}</span>}
        {!collapsed && item.badge && (
          <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1.5 text-xs font-semibold text-destructive-foreground">
            {item.badge}
          </span>
        )}
      </NavLink>
    );

    if (collapsed) {
      return (
        <Tooltip delayDuration={0}>
          <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
          <TooltipContent side="right" className="font-medium">
            {item.label}
          </TooltipContent>
        </Tooltip>
      );
    }

    return linkContent;
  };

  return (
    <aside
      className={cn(
        'relative flex flex-col h-screen bg-sidebar-background border-r border-sidebar-border transition-all duration-300 ease-in-out',
        collapsed ? 'w-[72px]' : 'w-64'
      )}
    >
      {/* Toggle button */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className={cn(
          'absolute -right-3 top-7 z-50 flex h-6 w-6 items-center justify-center rounded-full',
          'bg-sidebar-background border border-sidebar-border shadow-sm',
          'text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent',
          'transition-colors'
        )}
      >
        {collapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronLeft className="h-3.5 w-3.5" />}
      </button>

      {/* Logo */}
      <div
        className={cn(
          'flex items-center h-16 px-4 border-b border-sidebar-border',
          collapsed ? 'justify-center' : 'gap-3'
        )}
      >
        <img
          src={logoMatheusVeiculos}
          alt="Logo"
          className={cn('object-contain transition-all', collapsed ? 'h-8 w-8' : 'h-9')}
        />
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 py-4">
        <nav className={cn('space-y-6', collapsed ? 'px-2' : 'px-3')}>
          {sections.map((section) => (
            <div key={section.title}>
              {!collapsed && (
                <h3 className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-sidebar-foreground/50">
                  {section.title}
                </h3>
              )}
              <div className="space-y-1">
                {section.items.map((item) => (
                  <NavItemComponent key={item.href} item={item} />
                ))}
              </div>
            </div>
          ))}
        </nav>
      </ScrollArea>

      {/* Footer */}
      <div className={cn('border-t border-sidebar-border p-3 space-y-3', collapsed && 'px-2')}>
        {/* Actions row */}
        <div className={cn('flex items-center', collapsed ? 'flex-col gap-2' : 'justify-between')}>
          <NotificationBell />
          <ThemeToggle />
        </div>

        {/* User info */}
        {!collapsed && (
          <div className="flex items-center gap-3 px-2 py-2 rounded-xl bg-sidebar-accent/50">
            <div className="h-9 w-9 rounded-full bg-gradient-to-br from-sidebar-primary to-sidebar-primary/70 flex items-center justify-center shadow-sm">
              <span className="text-sm font-semibold text-sidebar-primary-foreground">
                {(user?.user_metadata?.full_name || user?.email || 'U')[0].toUpperCase()}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-sidebar-foreground truncate">
                {user?.user_metadata?.full_name || user?.email?.split('@')[0]}
              </p>
              <p className="text-xs text-sidebar-foreground/60">{getRoleLabel()}</p>
            </div>
          </div>
        )}

        {/* Action buttons */}
        <div className={cn('flex', collapsed ? 'flex-col gap-1' : 'gap-1')}>
          {collapsed ? (
            <>
              {isGerente && (
                <Tooltip delayDuration={0}>
                  <TooltipTrigger asChild>
                    <NavLink
                      to="/configuracoes"
                      className="flex items-center justify-center p-2.5 rounded-xl text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
                    >
                      <Settings className="h-5 w-5" />
                    </NavLink>
                  </TooltipTrigger>
                  <TooltipContent side="right">Configurações</TooltipContent>
                </Tooltip>
              )}
              <Tooltip delayDuration={0}>
                <TooltipTrigger asChild>
                  <button
                    onClick={signOut}
                    className="flex items-center justify-center p-2.5 rounded-xl text-sidebar-foreground/70 hover:text-destructive hover:bg-destructive/10 transition-colors"
                  >
                    <LogOut className="h-5 w-5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right">Sair</TooltipContent>
              </Tooltip>
            </>
          ) : (
            <>
              {isGerente && (
                <NavLink
                  to="/configuracoes"
                  className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-sm font-medium text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
                >
                  <Settings className="h-4 w-4" />
                  <span>Config</span>
                </NavLink>
              )}
              <button
                onClick={signOut}
                className={cn(
                  "flex items-center justify-center gap-2 py-2 rounded-xl text-sm font-medium text-sidebar-foreground/70 hover:text-destructive hover:bg-destructive/10 transition-colors",
                  isGerente ? "flex-1" : "w-full"
                )}
              >
                <LogOut className="h-4 w-4" />
                <span>Sair</span>
              </button>
            </>
          )}
        </div>
      </div>
    </aside>
  );
}