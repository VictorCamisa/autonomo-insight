import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Database, Save, ArrowRight, Server, HardDrive, CheckCircle2, XCircle, RefreshCw, Loader2 } from 'lucide-react';
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
import { toast } from 'sonner';
import { useAIAgent, useUpdateAIAgent, useAIAgentDataSources, useCreateAIAgentDataSource, useDeleteAIAgentDataSource } from '@/hooks/useAIAgents';
import { SHORT_TERM_MEMORY_TYPES } from '@/types/ai-agents';

const formSchema = z.object({
  short_term_memory_type: z.string(),
  redis_host: z.string().optional(),
  redis_port: z.number().optional(),
  redis_password_encrypted: z.string().optional(),
  context_window_size: z.number().min(1).max(50),
  long_term_memory_enabled: z.boolean(),
});

type FormData = z.infer<typeof formSchema>;

interface DataSourceConfig {
  id: string;
  name: string;
  description: string;
  type: string;
  icon: string;
  tables: string[];
}

const AVAILABLE_DATA_SOURCES: DataSourceConfig[] = [
  {
    id: 'inventory',
    name: 'Estoque de Veículos',
    description: 'Acesso ao catálogo de veículos disponíveis, preços, características',
    type: 'inventory',
    icon: '🚗',
    tables: ['vehicles'],
  },
  {
    id: 'crm',
    name: 'CRM (Leads)',
    description: 'Acesso a leads, status de qualificação, histórico de contatos',
    type: 'crm',
    icon: '👥',
    tables: ['leads'],
  },
  {
    id: 'negotiations',
    name: 'Negociações',
    description: 'Pipeline de vendas, propostas, agendamentos',
    type: 'negotiations',
    icon: '🤝',
    tables: ['negotiations'],
  },
  {
    id: 'sales',
    name: 'Vendas',
    description: 'Histórico de vendas, métricas, performance',
    type: 'sales',
    icon: '💰',
    tables: ['sales'],
  },
  {
    id: 'faq',
    name: 'FAQ / Base de Conhecimento',
    description: 'Informações gerais da loja, políticas, horários',
    type: 'faq',
    icon: '📚',
    tables: [],
  },
];

export default function AgentMemoryPage() {
  const { agentId } = useParams();
  const navigate = useNavigate();
  const [syncingSource, setSyncingSource] = useState<string | null>(null);
  
  const { data: agent, isLoading } = useAIAgent(agentId);
  const { data: dataSources = [], refetch: refetchDataSources } = useAIAgentDataSources(agentId);
  const updateAgent = useUpdateAIAgent();
  const createDataSource = useCreateAIAgentDataSource();
  const deleteDataSource = useDeleteAIAgentDataSource();

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

  const isSourceConnected = (sourceType: string) => {
    return dataSources.some(ds => ds.source_type === sourceType && ds.is_active);
  };

  const getSourceId = (sourceType: string) => {
    return dataSources.find(ds => ds.source_type === sourceType)?.id;
  };

  const handleToggleDataSource = async (source: DataSourceConfig) => {
    if (!agentId) return;

    setSyncingSource(source.type);

    try {
      const existingSource = dataSources.find(ds => ds.source_type === source.type);

      if (existingSource) {
        // Delete the source to disconnect
        await deleteDataSource.mutateAsync({ id: existingSource.id, agentId });
        toast.success(`${source.name} desconectado`);
      } else {
        // Create new data source connection with minimal required fields
        await createDataSource.mutateAsync({
          agent_id: agentId,
          name: source.name,
          source_type: source.type,
          table_name: source.tables[0] || null,
          embeddings_enabled: false,
          is_active: true,
        });
        toast.success(`${source.name} conectado com sucesso!`);
      }

      await refetchDataSources();
    } catch (error) {
      toast.error(`Erro ao ${isSourceConnected(source.type) ? 'desconectar' : 'conectar'} ${source.name}`);
    } finally {
      setSyncingSource(null);
    }
  };

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

  const connectedCount = dataSources.filter(ds => ds.is_active).length;

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
        {/* Data Sources - MAIN FEATURE */}
        <Card className="border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5 text-primary" />
              Fontes de Dados do Supabase
              {connectedCount > 0 && (
                <Badge variant="default" className="ml-2">
                  {connectedCount} conectada{connectedCount > 1 ? 's' : ''}
                </Badge>
              )}
            </CardTitle>
            <CardDescription>
              Conecte o agente às tabelas do Supabase para respostas baseadas em dados reais
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3">
              {AVAILABLE_DATA_SOURCES.map((source) => {
                const isConnected = isSourceConnected(source.type);
                const isSyncing = syncingSource === source.type;

                return (
                  <div 
                    key={source.id}
                    className={`flex items-center justify-between p-4 border rounded-lg transition-colors ${
                      isConnected ? 'bg-primary/5 border-primary/30' : 'hover:bg-muted/50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{source.icon}</span>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{source.name}</span>
                          {isConnected && (
                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">{source.description}</p>
                        {source.tables.length > 0 && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Tabelas: {source.tables.join(', ')}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {isSyncing ? (
                        <Loader2 className="h-4 w-4 animate-spin text-primary" />
                      ) : (
                        <Switch
                          checked={isConnected}
                          onCheckedChange={() => handleToggleDataSource(source)}
                        />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
              <p className="text-sm text-blue-700 dark:text-blue-300">
                <strong>💡 Como funciona:</strong> Quando uma fonte está conectada, o agente consulta 
                automaticamente os dados atualizados do Supabase a cada mensagem. Isso permite respostas 
                precisas sobre estoque, preços, clientes e muito mais.
              </p>
            </div>
          </CardContent>
        </Card>

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
