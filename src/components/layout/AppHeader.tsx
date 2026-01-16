import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { usePermissions } from '@/hooks/usePermissions';
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
} from 'lucide-react';
import { useState } from 'react';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { NotificationBell } from '@/components/notifications/NotificationBell';
import logoMatheusVeiculos from '@/assets/logo-matheus-veiculos.png';
import { MainNav } from './MainNav';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

export function AppHeader() {
  const { user, signOut } = useAuth();
  const { isGerente, role } = usePermissions();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const queryClient = useQueryClient();

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      // Invalidate all queries to refetch fresh data
      await queryClient.invalidateQueries();
      toast.success('Dados atualizados!');
    } catch (error) {
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
    <header className="sticky top-0 z-50 w-full border-b border-border/60 bg-background/90 backdrop-blur-md supports-[backdrop-filter]:bg-background/75">
      <div className="flex h-14 items-center px-4 gap-4">
        {/* Logo */}
        <Link to="/dashboard" className="flex items-center gap-2 shrink-0">
          <img 
            src={logoMatheusVeiculos} 
            alt="Matheus Veículos" 
            className="h-8 w-auto object-contain"
          />
        </Link>

        {/* Main Navigation - Desktop */}
        <div className="hidden lg:block flex-1">
          <ScrollArea className="w-full">
            <MainNav />
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </div>

        {/* Spacer for mobile */}
        <div className="flex-1 lg:hidden" />

        {/* Right Section */}
        <div className="flex items-center gap-2">
          {/* Refresh Button */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="h-9 w-9"
              >
                <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Atualizar dados (sem recarregar página)</p>
            </TooltipContent>
          </Tooltip>
          
          <NotificationBell />
          <ThemeToggle />
          
          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-1.5 px-2">
                <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-xs font-medium text-primary">
                    {(user?.user_metadata?.full_name || user?.email || 'U')[0].toUpperCase()}
                  </span>
                </div>
                <span className="hidden md:inline text-sm font-medium">
                  {user?.user_metadata?.full_name?.split(' ')[0] || 'Usuário'}
                </span>
                <ChevronDown className="h-3 w-3 opacity-50" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <div className="flex flex-col">
                  <span>{user?.user_metadata?.full_name || 'Usuário'}</span>
                  <span className="text-xs font-normal text-muted-foreground">
                    {getRoleLabel()}
                  </span>
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

          {/* Mobile Menu Button */}
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="lg:hidden">
                <Menu className="h-5 w-5" />
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
