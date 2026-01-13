import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Bot, 
  Plus, 
  MoreHorizontal, 
  Play, 
  Pause, 
  Trash2, 
  Settings,
  MessageSquare,
  TrendingUp
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { useAIAgents, useDeleteAIAgent, useUpdateAIAgent } from '@/hooks/useAIAgents';
import { AGENT_STATUS, AGENT_OBJECTIVES, LLM_PROVIDERS } from '@/types/ai-agents';

export default function AIAgentsListPage() {
  const navigate = useNavigate();
  const { data: agents, isLoading } = useAIAgents();
  const deleteAgent = useDeleteAIAgent();
  const updateAgent = useUpdateAIAgent();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [agentToDelete, setAgentToDelete] = useState<string | null>(null);

  const getStatusBadge = (status: string) => {
    const statusConfig = AGENT_STATUS.find(s => s.value === status);
    const colors: Record<string, string> = {
      green: 'bg-green-500/10 text-green-600 border-green-500/20',
      gray: 'bg-gray-500/10 text-gray-600 border-gray-500/20',
      yellow: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20',
    };
    return (
      <Badge variant="outline" className={colors[statusConfig?.color || 'gray']}>
        {statusConfig?.label || status}
      </Badge>
    );
  };

  const getObjectiveLabel = (objective: string) => {
    return AGENT_OBJECTIVES.find(o => o.value === objective)?.label || objective;
  };

  const getProviderLabel = (provider: string) => {
    return LLM_PROVIDERS.find(p => p.value === provider)?.label || provider;
  };

  const handleToggleStatus = (agentId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
    updateAgent.mutate({ id: agentId, data: { status: newStatus } });
  };

  const handleDelete = () => {
    if (agentToDelete) {
      deleteAgent.mutate(agentToDelete);
      setDeleteDialogOpen(false);
      setAgentToDelete(null);
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <div className="flex justify-between items-center">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Agentes de IA</h1>
          <p className="text-muted-foreground">
            Crie e gerencie agentes conversacionais para atendimento automatizado
          </p>
        </div>
        <Button onClick={() => navigate('/ai-agents/novo')} className="gap-2">
          <Plus className="h-4 w-4" />
          Novo Agente
        </Button>
      </div>

      {!agents || agents.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <Bot className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-lg font-medium mb-2">Nenhum agente criado</h3>
            <p className="text-muted-foreground text-center mb-4 max-w-md">
              Crie seu primeiro agente de IA para automatizar o atendimento aos clientes via WhatsApp e chat do site.
            </p>
            <Button onClick={() => navigate('/ai-agents/novo')} className="gap-2">
              <Plus className="h-4 w-4" />
              Criar Primeiro Agente
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {agents.map((agent, index) => (
            <motion.div
              key={agent.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className="hover:shadow-md transition-shadow cursor-pointer group">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Bot className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-base">{agent.name}</CardTitle>
                        <CardDescription className="text-xs">
                          {getProviderLabel(agent.llm_provider)} • {agent.llm_model}
                        </CardDescription>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => navigate(`/ai-agents/${agent.id}/basico`)}>
                          <Settings className="h-4 w-4 mr-2" />
                          Configurar
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleToggleStatus(agent.id, agent.status)}>
                          {agent.status === 'active' ? (
                            <>
                              <Pause className="h-4 w-4 mr-2" />
                              Pausar
                            </>
                          ) : (
                            <>
                              <Play className="h-4 w-4 mr-2" />
                              Ativar
                            </>
                          )}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          className="text-destructive"
                          onClick={() => {
                            setAgentToDelete(agent.id);
                            setDeleteDialogOpen(true);
                          }}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Excluir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardHeader>
                <CardContent 
                  className="space-y-4"
                  onClick={() => navigate(`/ai-agents/${agent.id}/basico`)}
                >
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {agent.description || 'Sem descrição'}
                  </p>
                  
                  <div className="flex items-center gap-2 flex-wrap">
                    {getStatusBadge(agent.status)}
                    <Badge variant="secondary" className="text-xs">
                      {getObjectiveLabel(agent.objective)}
                    </Badge>
                  </div>

                  <div className="flex items-center gap-4 text-xs text-muted-foreground pt-2 border-t">
                    <div className="flex items-center gap-1">
                      <MessageSquare className="h-3 w-3" />
                      <span>0 conversas</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <TrendingUp className="h-3 w-3" />
                      <span>0 leads</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Agente</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este agente? Esta ação não pode ser desfeita e todas as conversas associadas serão perdidas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
