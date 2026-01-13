import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Database, Save, ArrowRight, Server, HardDrive } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useAIAgent, useUpdateAIAgent } from '@/hooks/useAIAgents';
import { SHORT_TERM_MEMORY_TYPES, DATA_SOURCE_TYPES } from '@/types/ai-agents';

const formSchema = z.object({
  short_term_memory_type: z.string(),
  redis_host: z.string().optional(),
  redis_port: z.number().optional(),
  redis_password_encrypted: z.string().optional(),
  context_window_size: z.number().min(1).max(50),
  long_term_memory_enabled: z.boolean(),
});

type FormData = z.infer<typeof formSchema>;

export default function AgentMemoryPage() {
  const { agentId } = useParams();
  const navigate = useNavigate();
  
  const { data: agent, isLoading } = useAIAgent(agentId);
  const updateAgent = useUpdateAIAgent();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      short_term_memory_type: 'local',
      context_window_size: 10,
      long_term_memory_enabled: false,
    },
  });

  const memoryType = form.watch('short_term_memory_type');

  useEffect(() => {
    if (agent) {
      form.reset({
        short_term_memory_type: agent.short_term_memory_type,
        redis_host: agent.redis_host || '',
        redis_port: agent.redis_port || 6379,
        redis_password_encrypted: agent.redis_password_encrypted || '',
        context_window_size: agent.context_window_size,
        long_term_memory_enabled: agent.long_term_memory_enabled,
      });
    }
  }, [agent, form]);

  const onSubmit = async (data: FormData) => {
    await updateAgent.mutateAsync({ id: agentId!, data });
    navigate(`/ai-agents/${agentId}/ferramentas`);
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
    <div className="p-6 space-y-6 max-w-3xl">
      <div className="flex items-center gap-4">
        <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
          <Database className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Memória do Agente</h1>
          <p className="text-muted-foreground">
            Configure como o agente armazena e recupera contexto das conversas
          </p>
        </div>
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Short Term Memory */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <HardDrive className="h-5 w-5" />
              Memória de Curto Prazo
            </CardTitle>
            <CardDescription>
              Armazena o contexto da conversa atual
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label>Tipo de Armazenamento</Label>
              <Select
                value={form.watch('short_term_memory_type')}
                onValueChange={(value) => form.setValue('short_term_memory_type', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  {SHORT_TERM_MEMORY_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {memoryType === 'local' 
                  ? 'Memória é perdida quando a sessão termina'
                  : 'Memória persiste entre sessões via Redis'}
              </p>
            </div>

            {memoryType === 'redis' && (
              <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
                <div className="flex items-center gap-2">
                  <Server className="h-4 w-4" />
                  <span className="font-medium">Configuração Redis</span>
                </div>
                
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Host</Label>
                    <Input
                      placeholder="redis.exemplo.com"
                      {...form.register('redis_host')}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Porta</Label>
                    <Input
                      type="number"
                      placeholder="6379"
                      {...form.register('redis_port', { valueAsNumber: true })}
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label>Senha (opcional)</Label>
                  <Input
                    type="password"
                    placeholder="••••••••"
                    {...form.register('redis_password_encrypted')}
                  />
                </div>
              </div>
            )}

            <div className="space-y-4">
              <div className="flex justify-between">
                <Label>Tamanho do Contexto: {form.watch('context_window_size')} mensagens</Label>
              </div>
              <Slider
                value={[form.watch('context_window_size')]}
                onValueChange={([value]) => form.setValue('context_window_size', value)}
                min={3}
                max={30}
                step={1}
              />
              <p className="text-xs text-muted-foreground">
                Número de mensagens anteriores incluídas em cada chamada ao modelo
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Data Sources */}
        <Card>
          <CardHeader>
            <CardTitle>Fontes de Dados</CardTitle>
            <CardDescription>
              Conecte o agente a dados do sistema para respostas mais precisas
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3">
              {DATA_SOURCE_TYPES.slice(0, 3).map((source) => (
                <div 
                  key={source.value}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <Database className="h-4 w-4 text-muted-foreground" />
                    <span>{source.label}</span>
                  </div>
                  <Badge variant="secondary">
                    {source.value === 'inventory' ? 'Conectado' : 'Disponível'}
                  </Badge>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              Fontes de dados são configuradas automaticamente. O agente tem acesso ao estoque de veículos e ao CRM.
            </p>
          </CardContent>
        </Card>

        {/* Long Term Memory */}
        <Card>
          <CardHeader>
            <CardTitle>Memória de Longo Prazo</CardTitle>
            <CardDescription>
              Use embeddings vetoriais para recuperar informações relevantes
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <Label>Habilitar RAG (Retrieval Augmented Generation)</Label>
                <p className="text-xs text-muted-foreground">
                  Armazena e recupera conhecimento usando vetores semânticos
                </p>
              </div>
              <Switch
                checked={form.watch('long_term_memory_enabled')}
                onCheckedChange={(checked) => form.setValue('long_term_memory_enabled', checked)}
              />
            </div>
            
            {form.watch('long_term_memory_enabled') && (
              <div className="mt-4 p-4 border rounded-lg bg-amber-500/10 border-amber-500/20">
                <p className="text-sm text-amber-600">
                  ⚠️ RAG requer configuração adicional de embeddings. Entre em contato para habilitar.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => navigate(`/ai-agents/${agentId}/llm`)}>
            Voltar
          </Button>
          <Button 
            type="submit" 
            disabled={updateAgent.isPending}
            className="gap-2"
          >
            Salvar e Continuar
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </form>
    </div>
  );
}
