import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Plus, Shield, Trash2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { GUARDRAIL_TYPES, VIOLATION_ACTIONS } from '@/types/ai-agents';

interface Guardrail {
  id: string;
  name: string;
  description: string;
  type: string;
  action_on_violation: string;
  is_active: boolean;
}

export default function AgentGuardrailsPage() {
  const { agentId } = useParams();
  const { data: agent, isLoading } = useAIAgent(agentId);
  const [guardrails, setGuardrails] = useState<Guardrail[]>([
    {
      id: '1',
      name: 'Filtro de Linguagem Imprópria',
      description: 'Bloqueia respostas com palavrões ou linguagem ofensiva',
      type: 'content_filter',
      action_on_violation: 'block',
      is_active: true,
    },
    {
      id: '2',
      name: 'Limite de Desconto',
      description: 'Não permite oferecer descontos acima de 10%',
      type: 'business_rule',
      action_on_violation: 'escalate',
      is_active: true,
    },
    {
      id: '3',
      name: 'Verificação de Preço',
      description: 'Sempre confirma preços antes de informar ao cliente',
      type: 'business_rule',
      action_on_violation: 'warn',
      is_active: false,
    },
  ]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newGuardrail, setNewGuardrail] = useState({
    name: '',
    description: '',
    type: 'content_filter',
    action_on_violation: 'block',
  });

  const handleAddGuardrail = () => {
    if (!newGuardrail.name) return;
    
    setGuardrails([
      ...guardrails,
      {
        id: Date.now().toString(),
        ...newGuardrail,
        is_active: true,
      },
    ]);
    setNewGuardrail({ name: '', description: '', type: 'content_filter', action_on_violation: 'block' });
    setDialogOpen(false);
  };

  const toggleGuardrail = (id: string) => {
    setGuardrails(guardrails.map(g => 
      g.id === id ? { ...g, is_active: !g.is_active } : g
    ));
  };

  const removeGuardrail = (id: string) => {
    setGuardrails(guardrails.filter(g => g.id !== id));
  };

  const getTypeLabel = (type: string) => 
    GUARDRAIL_TYPES.find(t => t.value === type)?.label || type;

  const getActionLabel = (action: string) => 
    VIOLATION_ACTIONS.find(a => a.value === action)?.label || action;

  const getActionColor = (action: string) => {
    switch (action) {
      case 'block': return 'destructive';
      case 'warn': return 'secondary';
      case 'escalate': return 'outline';
      default: return 'secondary';
    }
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
            <Shield className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Guardrails</h1>
            <p className="text-muted-foreground">
              Configure regras de segurança e limites do agente
            </p>
          </div>
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Novo Guardrail
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Criar Guardrail</DialogTitle>
              <DialogDescription>
                Defina uma nova regra de segurança para o agente
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>Nome</Label>
                <Input
                  placeholder="Ex: Limite de Desconto"
                  value={newGuardrail.name}
                  onChange={(e) => setNewGuardrail({ ...newGuardrail, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Descrição</Label>
                <Textarea
                  placeholder="Descreva o que este guardrail protege..."
                  value={newGuardrail.description}
                  onChange={(e) => setNewGuardrail({ ...newGuardrail, description: e.target.value })}
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Tipo</Label>
                  <Select
                    value={newGuardrail.type}
                    onValueChange={(value) => setNewGuardrail({ ...newGuardrail, type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {GUARDRAIL_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Ação em Violação</Label>
                  <Select
                    value={newGuardrail.action_on_violation}
                    onValueChange={(value) => setNewGuardrail({ ...newGuardrail, action_on_violation: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {VIOLATION_ACTIONS.map((action) => (
                        <SelectItem key={action.value} value={action.value}>
                          {action.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button onClick={handleAddGuardrail} className="w-full">
                Criar Guardrail
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Guardrails Ativos</CardTitle>
          <CardDescription>
            Regras que controlam o comportamento e limites do agente
          </CardDescription>
        </CardHeader>
        <CardContent>
          {guardrails.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhum guardrail configurado. Crie o primeiro!
            </div>
          ) : (
            <div className="space-y-3">
              {guardrails.map((guardrail) => (
                <div
                  key={guardrail.id}
                  className="flex items-center gap-4 p-4 border rounded-lg bg-card"
                >
                  <AlertTriangle className={`h-5 w-5 ${guardrail.is_active ? 'text-amber-500' : 'text-muted-foreground'}`} />
                  
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium">{guardrail.name}</span>
                      <Badge variant="outline">{getTypeLabel(guardrail.type)}</Badge>
                      <Badge variant={getActionColor(guardrail.action_on_violation) as any}>
                        {getActionLabel(guardrail.action_on_violation)}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {guardrail.description}
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <Switch
                      checked={guardrail.is_active}
                      onCheckedChange={() => toggleGuardrail(guardrail.id)}
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeGuardrail(guardrail.id)}
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
