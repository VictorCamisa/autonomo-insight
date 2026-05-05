import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { usePermissions } from '@/hooks/usePermissions';
import { useSidebarContext } from '@/contexts/SidebarContext';
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
import { motion, AnimatePresence } from 'framer-motion';
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
  const { open, setOpen } = useSidebarContext();

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
      requiredModules: ['comissoes', 'marketing', 'configuracoes'],
      items: [
        { label: 'Comissões', href: '/comissoes', icon: Wallet, requiredModule: 'comissoes' },
        { label: 'Marketing', href: '/marketing', icon: Megaphone, requiredModule: 'marketing' },
        { label: 'Relatórios', href: '/relatorios', icon: FileText, requiredModule: 'marketing' },
        { label: 'WhatsApp', href: '/whatsapp', icon: MessageSquare, requiredModule: 'configuracoes' },
        { label: 'IA / Agentes', href: '/ia-agentes', icon: Bot, requiredModule: 'configuracoes' },
      ],
    },
  ];

  const sections = allSections
    .map(section => {
      if (section.requiredModules) {
        const hasAccess = section.requiredModules.some(mod => hasModuleAccess(mod));
        if (!hasAccess) return null;
      }
      const filteredItems = section.items.filter(item =>
        !item.requiredModule || hasModuleAccess(item.requiredModule)
      );
      if (filteredItems.length === 0) return null;
      return { ...section, items: filteredItems };
    })
    .filter(Boolean) as NavSection[];

  const isActive = (href: string) => {
    if (href === '/dashboard') return location.pathname === href;
    return location.pathname === href || location.pathname.startsWith(href + '/');
  };

  const getRoleLabel = () => {
    switch (role) {
      case 'gerente': return 'Gerente';
      case 'vendedor': return 'Vendedor';
      case 'marketing': return 'Marketing';
      default: return 'Usuário';
    }
  };

  const userInitial = (user?.user_metadata?.full_name || user?.email || 'U')[0].toUpperCase();
  const userName = user?.user_metadata?.full_name?.split(' ')[0] || user?.email?.split('@')[0] || 'Usuário';

  return (
    <>
      <motion.aside
        initial={false}
        animate={{ width: open ? 224 : 0, opacity: open ? 1 : 0 }}
        transition={{ duration: 0.28, ease: [0.4, 0, 0.2, 1] }}
        className="relative flex flex-col h-screen bg-sidebar border-r border-sidebar-border overflow-hidden shrink-0"
      >
        {/* Header */}
        <div className="flex items-center h-14 px-4 border-b border-sidebar-border shrink-0 gap-2">
          <AnimatePresence>
            {open && (
              <motion.div
                layoutId="matheus-logo"
                className="flex items-center gap-2.5 flex-1 min-w-0"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.18 }}
              >
                <img
                  src={logoMatheusVeiculos}
                  alt="Matheus Veículos"
                  className="h-8 w-auto object-contain shrink-0"
                />
              </motion.div>
            )}
          </AnimatePresence>

          <button
            onClick={() => setOpen(false)}
            aria-label="Fechar menu"
            className="ml-auto h-6 w-6 flex items-center justify-center rounded-md text-sidebar-foreground/40 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors shrink-0"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
        </div>

        {/* Navigation */}
        <ScrollArea className="flex-1 py-3">
          <nav className="px-3 space-y-5">
            {sections.map((section) => (
              <div key={section.title}>
                <p className="mb-1 px-2 text-[10px] font-semibold uppercase tracking-widest text-sidebar-foreground/30 whitespace-nowrap">
                  {section.title}
                </p>
                <div className="space-y-0.5">
                  {section.items.map((item) => {
                    const active = isActive(item.href);
                    return (
                      <NavLink
                        key={item.href}
                        to={item.href}
                        className={cn(
                          'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-150 whitespace-nowrap',
                          active
                            ? 'bg-sidebar-primary text-sidebar-primary-foreground shadow-sm'
                            : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                        )}
                      >
                        <item.icon className="h-4 w-4 shrink-0" />
                        <span className="truncate">{item.label}</span>
                        {item.badge && (
                          <span className="ml-auto flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-destructive-foreground">
                            {item.badge}
                          </span>
                        )}
                      </NavLink>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>
        </ScrollArea>

        {/* Footer */}
        <div className="shrink-0 border-t border-sidebar-border p-3 space-y-2">
          <div className="flex items-center gap-1">
            <NotificationBell />
            <ThemeToggle />
          </div>

          <div className="flex items-center gap-2.5 rounded-lg bg-sidebar-accent/60 px-2.5 py-2">
            <div className="h-7 w-7 rounded-full bg-sidebar-primary flex items-center justify-center shrink-0">
              <span className="text-xs font-bold text-sidebar-primary-foreground">{userInitial}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-sidebar-foreground truncate leading-none mb-0.5">{userName}</p>
              <p className="text-[10px] text-sidebar-foreground/45 leading-none whitespace-nowrap">{getRoleLabel()}</p>
            </div>
          </div>

          <div className="flex gap-1">
            {isGerente && (
              <NavLink
                to="/configuracoes"
                className="flex flex-1 items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium text-sidebar-foreground/55 hover:text-sidebar-accent-foreground hover:bg-sidebar-accent transition-colors whitespace-nowrap"
              >
                <Settings className="h-3.5 w-3.5 shrink-0" />
                <span>Configurações</span>
              </NavLink>
            )}
            <button
              onClick={signOut}
              className={cn(
                'flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap',
                'text-sidebar-foreground/55 hover:text-destructive hover:bg-destructive/10 transition-colors',
                isGerente ? 'flex-1' : 'w-full'
              )}
            >
              <LogOut className="h-3.5 w-3.5 shrink-0" />
              <span>Sair</span>
            </button>
          </div>
        </div>
      </motion.aside>

      {/* Botão flutuante de abertura */}
      <AnimatePresence>
        {!open && (
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            transition={{ duration: 0.2 }}
            className="fixed left-0 top-1/2 -translate-y-1/2 z-50"
          >
            <Tooltip delayDuration={0}>
              <TooltipTrigger asChild>
                <button
                  onClick={() => setOpen(true)}
                  aria-label="Abrir menu"
                  className="h-10 w-5 flex items-center justify-center bg-sidebar border border-l-0 border-sidebar-border rounded-r-md text-sidebar-foreground/40 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors shadow-elevation-2"
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right" className="text-xs">Abrir menu</TooltipContent>
            </Tooltip>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
