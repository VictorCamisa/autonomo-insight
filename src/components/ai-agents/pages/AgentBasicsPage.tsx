import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Bot, Save, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useAIAgent, useCreateAIAgent, useUpdateAIAgent } from '@/hooks/useAIAgents';
import { AGENT_OBJECTIVES, AGENT_STATUS, DEFAULT_AGENT } from '@/types/ai-agents';

const formSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  description: z.string().optional(),
  objective: z.string(),
  status: z.enum(['active', 'inactive', 'training']),
});

type FormData = z.infer<typeof formSchema>;

export default function AgentBasicsPage() {
  const { agentId } = useParams();
  const navigate = useNavigate();
  const isNew = !agentId || agentId === 'novo';
  
  const { data: agent, isLoading } = useAIAgent(isNew ? undefined : agentId);
  const createAgent = useCreateAIAgent();
  const updateAgent = useUpdateAIAgent();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      description: '',
      objective: 'qualify_leads',
      status: 'inactive',
    },
  });

  useEffect(() => {
    if (agent) {
      form.reset({
        name: agent.name,
        description: agent.description || '',
        objective: agent.objective,
        status: agent.status,
      });
    }
  }, [agent, form]);

  const onSubmit = async (data: FormData) => {
    if (isNew) {
      const newAgent = await createAgent.mutateAsync({
        ...DEFAULT_AGENT,
        ...data,
      });
      navigate(`/ai-agents/${newAgent.id}/llm`);
    } else {
      await updateAgent.mutateAsync({ id: agentId!, data });
    }
  };

  if (isLoading && !isNew) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-[400px]" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-3xl">
      <div className="flex items-center gap-4">
        <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
          <Bot className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">
            {isNew ? 'Criar Novo Agente' : 'Configurações Básicas'}
          </h1>
          <p className="text-muted-foreground">
            {isNew ? 'Configure as informações básicas do seu agente de IA' : 'Edite as informações básicas do agente'}
          </p>
        </div>
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)}>
        <Card>
          <CardHeader>
            <CardTitle>Informações do Agente</CardTitle>
            <CardDescription>
              Defina o nome, descrição e objetivo principal do agente
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name">Nome do Agente *</Label>
              <Input
                id="name"
                placeholder="Ex: Assistente de Vendas"
                {...form.register('name')}
              />
              {form.formState.errors.name && (
                <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descrição</Label>
              <Textarea
                id="description"
                placeholder="Descreva brevemente o propósito deste agente..."
                rows={3}
                {...form.register('description')}
              />
            </div>

            <div className="grid gap-6 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Objetivo Principal</Label>
                <Select
                  value={form.watch('objective')}
                  onValueChange={(value) => form.setValue('objective', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o objetivo" />
                  </SelectTrigger>
                  <SelectContent>
                    {AGENT_OBJECTIVES.map((obj) => (
                      <SelectItem key={obj.value} value={obj.value}>
                        {obj.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={form.watch('status')}
                  onValueChange={(value: 'active' | 'inactive' | 'training') => form.setValue('status', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o status" />
                  </SelectTrigger>
                  <SelectContent>
                    {AGENT_STATUS.map((status) => (
                      <SelectItem key={status.value} value={status.value}>
                        {status.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3 mt-6">
          <Button type="button" variant="outline" onClick={() => navigate('/ai-agents')}>
            Cancelar
          </Button>
          <Button 
            type="submit" 
            disabled={createAgent.isPending || updateAgent.isPending}
            className="gap-2"
          >
            {isNew ? (
              <>
                Criar e Continuar
                <ArrowRight className="h-4 w-4" />
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Salvar Alterações
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
