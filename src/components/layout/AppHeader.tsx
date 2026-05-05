import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { usePermissions } from '@/hooks/usePermissions';
import { useSidebarContext } from '@/contexts/SidebarContext';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import {
  Settings,
  LogOut,
  ChevronDown,
  Menu,
  RefreshCw,
  Maximize,
  Minimize,
} from 'lucide-react';
import { useState, useCallback, useEffect } from 'react';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { NotificationBell } from '@/components/notifications/NotificationBell';
import { MainNav } from './MainNav';
import logoMatheusVeiculos from '@/assets/logo-matheus-veiculos.png';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { motion, AnimatePresence } from 'framer-motion';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

export function AppHeader() {
  const { user, signOut } = useAuth();
  const { isGerente, role } = usePermissions();
  const { open: sidebarOpen } = useSidebarContext();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    const onChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await queryClient.invalidateQueries();
      toast.success('Dados atualizados!');
    } catch {
      toast.error('Erro ao atualizar dados');
    } finally {
      setIsRefreshing(false);
    }
  };

  const getRoleLabel = () => {
    switch (role) {
      case 'gerente': return 'Gerente';
      case 'vendedor': return 'Vendedor';
      case 'marketing': return 'Marketing';
      default: return 'Usuário';
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/50 bg-background/90 backdrop-blur-md supports-[backdrop-filter]:bg-background/75">
      <div className="flex h-14 items-center px-3 sm:px-4 gap-2 sm:gap-3">
        {/* Logo — aparece quando sidebar fecha */}
        <AnimatePresence mode="wait">
          {!sidebarOpen && (
            <motion.div
              layoutId="matheus-logo"
              key="header-logo"
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
              transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
              className="flex items-center gap-2.5 shrink-0"
            >
              <Link to="/dashboard" className="flex items-center gap-2.5">
                <img
                  src={logoMatheusVeiculos}
                  alt="Matheus Veículos"
                  className="h-8 w-auto object-contain shrink-0"
                />
              </Link>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex-1" />

        <div className="flex items-center gap-1 sm:gap-1.5">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="h-8 w-8"
              >
                <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              </Button>
            </TooltipTrigger>
            <TooltipContent className="text-xs">Atualizar dados</TooltipContent>
          </Tooltip>

          <NotificationBell />

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" onClick={toggleFullscreen} className="hidden sm:inline-flex h-8 w-8">
                {isFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
              </Button>
            </TooltipTrigger>
            <TooltipContent className="text-xs">{isFullscreen ? 'Sair da tela cheia' : 'Tela cheia'}</TooltipContent>
          </Tooltip>

          <ThemeToggle />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-1.5 px-2 h-8">
                <div className="h-6 w-6 rounded-full bg-primary/15 flex items-center justify-center ring-1 ring-primary/25">
                  <span className="text-[11px] font-semibold text-primary">
                    {(user?.user_metadata?.full_name || user?.email || 'U')[0].toUpperCase()}
                  </span>
                </div>
                <span className="hidden md:inline text-sm font-medium">
                  {user?.user_metadata?.full_name?.split(' ')[0] || 'Usuário'}
                </span>
                <ChevronDown className="h-3 w-3 opacity-40" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <div className="flex flex-col gap-0.5">
                  <span className="font-semibold">{user?.user_metadata?.full_name || 'Usuário'}</span>
                  <span className="text-xs font-normal text-muted-foreground">{getRoleLabel()}</span>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {isGerente && (
                <DropdownMenuItem asChild>
                  <Link to="/configuracoes" className="cursor-pointer">
                    <Settings className="h-4 w-4 mr-2" />
                    Configurações
                  </Link>
                </DropdownMenuItem>
              )}
              {isGerente && <DropdownMenuSeparator />}
              <DropdownMenuItem onClick={signOut} className="text-destructive cursor-pointer">
                <LogOut className="h-4 w-4 mr-2" />
                Sair
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="lg:hidden h-8 w-8">
                <Menu className="h-4 w-4" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 p-4">
              <div className="flex flex-col gap-2 mt-4">
                <MainNav vertical onItemClick={() => setMobileOpen(false)} />
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
