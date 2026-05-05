import { NavLink, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { LucideIcon } from 'lucide-react';

interface SubNavItem {
  path: string;
  label: string;
  icon: React.ReactNode;
}

interface ModuleHeaderProps {
  icon: LucideIcon;
  title: string;
  description: string;
  basePath: string;
  navItems: SubNavItem[];
  actions?: React.ReactNode;
}

export function ModuleHeader({ icon: Icon, title, description, basePath, navItems, actions }: ModuleHeaderProps) {
  const location = useLocation();

  return (
    <div className="border-b bg-card mb-6">
      <div className="px-4 py-4 flex items-center gap-3">
        <div className="p-2 rounded-lg bg-primary/10">
          <Icon className="h-6 w-6 text-primary" />
        </div>
        <div className="flex-1">
          <h1 className="text-xl font-semibold">{title}</h1>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        {actions && <div className="ml-auto">{actions}</div>}
      </div>

      <ScrollArea className="w-full">
        <nav className="flex items-center gap-1 px-4 pb-3">
          {navItems.map((item) => {
            const isActive = item.path === basePath
              ? location.pathname === basePath
              : location.pathname === item.path;

            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={cn(
                  'flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap',
                  'hover:bg-accent hover:text-accent-foreground',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground'
                )}
              >
                {item.icon}
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  );
}
