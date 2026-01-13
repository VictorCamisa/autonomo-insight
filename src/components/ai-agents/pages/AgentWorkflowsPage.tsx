import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Plus, GitBranch, Trash2, Play, Pause, GripVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { useAIAgent } from '@/hooks/useAIAgents';

interface Workflow {
  id: string;
  name: string;
  description: string;
  is_active: boolean;
  is_default: boolean;
  priority: number;
  trigger_conditions: Record<string, unknown>;
}

export default function AgentWorkflowsPage() {
  const { agentId } = useParams();
  const { data: agent, isLoading } = useAIAgent(agentId);
  const [workflows, setWorkflows] = useState<Workflow[]>([
    {
      id: '1',
      name: 'Fluxo de Qualificação',
      description: 'Coleta nome, telefone e interesse do lead',
      is_active: true,
      is_default: true,
      priority: 1,
      trigger_conditions: { intent: 'new_lead' },
    },
    {
      id: '2',
      name: 'Agendamento de Test Drive',
      description: 'Agenda visita ou test drive na loja',
      is_active: true,
      is_default: false,
      priority: 2,
      trigger_conditions: { intent: 'schedule' },
    },
  ]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newWorkflow, setNewWorkflow] = useState({ name: '', description: '' });

  const handleAddWorkflow = () => {
    if (!newWorkflow.name) return;
    
    setWorkflows([
      ...workflows,
      {
        id: Date.now().toString(),
        name: newWorkflow.name,
        description: newWorkflow.description,
        is_active: false,
        is_default: false,
        priority: workflows.length + 1,
        trigger_conditions: {},
      },
    ]);
    setNewWorkflow({ name: '', description: '' });
    setDialogOpen(false);
  };

  const toggleWorkflow = (id: string) => {
    setWorkflows(workflows.map(w => 
      w.id === id ? { ...w, is_active: !w.is_active } : w
    ));
  };

  const removeWorkflow = (id: string) => {
    setWorkflows(workflows.filter(w => w.id !== id));
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-[400px]" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
            <GitBranch className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Workflows</h1>
            <p className="text-muted-foreground">
              Configure fluxos de conversação do agente
            </p>
          </div>
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Novo Workflow
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Criar Workflow</DialogTitle>
              <DialogDescription>
                Defina um novo fluxo de conversação para o agente
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>Nome do Workflow</Label>
                <Input
                  placeholder="Ex: Qualificação de Leads"
                  value={newWorkflow.name}
                  onChange={(e) => setNewWorkflow({ ...newWorkflow, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Descrição</Label>
                <Textarea
                  placeholder="Descreva o objetivo deste workflow..."
                  value={newWorkflow.description}
                  onChange={(e) => setNewWorkflow({ ...newWorkflow, description: e.target.value })}
                />
              </div>
              <Button onClick={handleAddWorkflow} className="w-full">
                Criar Workflow
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Workflows Configurados</CardTitle>
          <CardDescription>
            Arraste para reordenar a prioridade dos workflows
          </CardDescription>
        </CardHeader>
        <CardContent>
          {workflows.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhum workflow configurado. Crie o primeiro!
            </div>
          ) : (
            <div className="space-y-3">
              {workflows.map((workflow) => (
                <div
                  key={workflow.id}
                  className="flex items-center gap-4 p-4 border rounded-lg bg-card"
                >
                  <GripVertical className="h-5 w-5 text-muted-foreground cursor-grab" />
                  
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{workflow.name}</span>
                      {workflow.is_default && (
                        <Badge variant="secondary">Padrão</Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {workflow.description}
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <Switch
                      checked={workflow.is_active}
                      onCheckedChange={() => toggleWorkflow(workflow.id)}
                    />
                    {workflow.is_active ? (
                      <Play className="h-4 w-4 text-green-500" />
                    ) : (
                      <Pause className="h-4 w-4 text-muted-foreground" />
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeWorkflow(workflow.id)}
                      disabled={workflow.is_default}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
