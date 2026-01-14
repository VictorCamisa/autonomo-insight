import { cn } from "@/lib/utils";
import { 
  LayoutDashboard, 
  Database, 
  Cloud, 
  Shield, 
  Link, 
  GraduationCap,
  Boxes,
  Route,
  Code2,
  Bot
} from "lucide-react";
import type { DocSection } from "./DocumentationLayout";

interface DocumentationNavProps {
  activeSection: DocSection;
  onSectionChange: (section: DocSection) => void;
}

const navItems: { id: DocSection; label: string; icon: React.ElementType }[] = [
  { id: "overview", label: "Visão Geral", icon: LayoutDashboard },
  { id: "ai-agent", label: "AI Agent (Técnico)", icon: Bot },
  { id: "modules", label: "Módulos do Sistema", icon: Boxes },
  { id: "database", label: "Banco de Dados", icon: Database },
  { id: "edge-functions", label: "Edge Functions", icon: Cloud },
  { id: "hooks", label: "Hooks React", icon: Code2 },
  { id: "routes", label: "Rotas da Aplicação", icon: Route },
  { id: "permissions", label: "Sistema de Permissões", icon: Shield },
  { id: "integrations", label: "Integrações Externas", icon: Link },
  { id: "tutorials", label: "Tutoriais de Uso", icon: GraduationCap },
];

export const DocumentationNav = ({ activeSection, onSectionChange }: DocumentationNavProps) => {
  return (
    <nav className="p-2 space-y-1">
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = activeSection === item.id;
        
        return (
          <button
            key={item.id}
            onClick={() => onSectionChange(item.id)}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
              isActive 
                ? "bg-primary text-primary-foreground" 
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            )}
          >
            <Icon className="h-4 w-4" />
            {item.label}
          </button>
        );
      })}
    </nav>
  );
};
