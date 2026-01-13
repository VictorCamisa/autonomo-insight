import { Outlet, NavLink, useParams, useLocation } from 'react-router-dom';
import { 
  Bot, 
  Settings, 
  Brain, 
  Database, 
  Wrench, 
  GitBranch, 
  Shield, 
  BarChart3, 
  Bell, 
  TestTube, 
  Rocket,
  ChevronLeft,
  Plus
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useAIAgent } from '@/hooks/useAIAgents';

const agentNavItems = [
  { path: 'basico', label: 'Básico', icon: Settings },
  { path: 'llm', label: 'Modelo LLM', icon: Brain },
  { path: 'memoria', label: 'Memória', icon: Database },
  { path: 'ferramentas', label: 'Ferramentas', icon: Wrench },
  { path: 'workflows', label: 'Workflows', icon: GitBranch },
  { path: 'guardrails', label: 'Guardrails', icon: Shield },
  { path: 'monitoramento', label: 'Métricas', icon: BarChart3 },
  { path: 'testes', label: 'Testes', icon: TestTube },
  { path: 'implantacao', label: 'Implantação', icon: Rocket },
];

export default function AIAgentsLayout() {
  const { agentId } = useParams();
  const location = useLocation();
  const { data: agent } = useAIAgent(agentId);
  
  const isListPage = location.pathname === '/ai-agents' || location.pathname === '/ai-agents/';
  const isNewAgent = location.pathname.includes('/novo');

  return (
    <div className="flex h-[calc(100vh-4rem)]">
      {/* Sidebar */}
      <aside className="w-64 border-r bg-card flex flex-col">
        <div className="p-4 border-b">
          <NavLink to="/ai-agents">
            <Button variant="ghost" className="w-full justify-start gap-2">
              <ChevronLeft className="h-4 w-4" />
              Voltar para Agentes
            </Button>
          </NavLink>
        </div>

        {agentId && !isNewAgent && (
          <>
            <div className="p-4 border-b">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Bot className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{agent?.name || 'Carregando...'}</p>
                  <p className="text-xs text-muted-foreground capitalize">{agent?.status || 'inactive'}</p>
                </div>
              </div>
            </div>

            <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
              {agentNavItems.map((item) => (
                <NavLink
                  key={item.path}
                  to={`/ai-agents/${agentId}/${item.path}`}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors',
                      isActive
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                    )
                  }
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </NavLink>
              ))}
            </nav>
          </>
        )}

        {(isListPage || isNewAgent) && (
          <div className="flex-1 p-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Bot className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-medium">Centro de IA</p>
                <p className="text-xs text-muted-foreground">Gerencie seus agentes</p>
              </div>
            </div>
            
            <NavLink to="/ai-agents/novo">
              <Button className="w-full gap-2">
                <Plus className="h-4 w-4" />
                Novo Agente
              </Button>
            </NavLink>
          </div>
        )}
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto bg-background">
        <Outlet />
      </main>
    </div>
  );
}
