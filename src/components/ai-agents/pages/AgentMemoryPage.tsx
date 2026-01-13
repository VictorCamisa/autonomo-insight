import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Database, ArrowRight, Server, HardDrive, CheckCircle2, Loader2, Link2, Link2Off, RefreshCw } from 'lucide-react';
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
import { supabase } from '@/integrations/supabase/client';
import { useAIAgent, useUpdateAIAgent } from '@/hooks/useAIAgents';
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
  const [isCheckingConnection, setIsCheckingConnection] = useState(false);
  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const [connectionInfo, setConnectionInfo] = useState<{ tables: number; url: string } | null>(null);
  const [enabledSources, setEnabledSources] = useState<string[]>([]);
  const [savingSource, setSavingSource] = useState<string | null>(null);
  
  const { data: agent, isLoading, refetch } = useAIAgent(agentId);
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

  // Check Supabase connection
  const checkConnection = async () => {
    setIsCheckingConnection(true);
    try {
      // Try to query a simple table to verify connection
      const { error } = await supabase.from('vehicles').select('id').limit(1);
      
      if (error) {
        setIsConnected(false);
        setConnectionInfo(null);
        toast.error('Não foi possível conectar ao Supabase');
      } else {
        setIsConnected(true);
        
        // Count available tables by checking which ones exist
        const tableChecks = await Promise.all([
          supabase.from('vehicles').select('id', { count: 'exact', head: true }).then(r => !r.error),
          supabase.from('leads').select('id', { count: 'exact', head: true }).then(r => !r.error),
          supabase.from('negotiations').select('id', { count: 'exact', head: true }).then(r => !r.error),
          supabase.from('sales').select('id', { count: 'exact', head: true }).then(r => !r.error),
          supabase.from('customers').select('id', { count: 'exact', head: true }).then(r => !r.error),
        ]);
        
        const availableTables = tableChecks.filter(Boolean).length;
        
        // Get actual Supabase project info from URL
        const supabaseUrl = 'ahfoixzdnpswuqavbmgf.supabase.co';
        
        setConnectionInfo({
          tables: availableTables,
          url: `Matheus Veículos (${supabaseUrl})`,
        });
        toast.success('Conexão com Supabase verificada!');
      }
    } catch (err) {
      setIsConnected(false);
      setConnectionInfo(null);
      toast.error('Erro ao verificar conexão');
    } finally {
      setIsCheckingConnection(false);
    }
  };

  useEffect(() => {
    // Auto-check connection on mount
    checkConnection();
  }, []);

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
      
      // Load enabled sources from vector_db_config
      const config = agent.vector_db_config as Record<string, unknown> || {};
      const sources = (config.enabled_data_sources as string[]) || [];
      setEnabledSources(sources);
    }
  }, [agent, form]);

  const isSourceEnabled = (sourceType: string) => {
    return enabledSources.includes(sourceType);
  };

  const handleToggleDataSource = async (source: DataSourceConfig) => {
    if (!agentId) return;

    setSavingSource(source.type);

    try {
      const currentConfig = (agent?.vector_db_config as Record<string, unknown>) || {};
      const currentSources = (currentConfig.enabled_data_sources as string[]) || [];
      
      let newSources: string[];
      if (currentSources.includes(source.type)) {
        newSources = currentSources.filter(s => s !== source.type);
        toast.success(`${source.name} desconectado`);
      } else {
        newSources = [...currentSources, source.type];
        toast.success(`${source.name} conectado!`);
      }

      // Update agent with new sources
      await updateAgent.mutateAsync({
        id: agentId,
        data: {
          vector_db_config: {
            ...currentConfig,
            enabled_data_sources: newSources,
          },
        } as any,
      });

      setEnabledSources(newSources);
      await refetch();
    } catch (error) {
      toast.error(`Erro ao ${isSourceEnabled(source.type) ? 'desconectar' : 'conectar'} ${source.name}`);
    } finally {
      setSavingSource(null);
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

  const connectedCount = enabledSources.length;

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
        {/* Connection Status Card */}
        <Card className={isConnected ? 'border-green-500/30 bg-green-500/5' : 'border-orange-500/30 bg-orange-500/5'}>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              {isConnected ? (
                <>
                  <Link2 className="h-5 w-5 text-green-500" />
                  <span className="text-green-700 dark:text-green-400">Supabase Conectado</span>
                </>
              ) : (
                <>
                  <Link2Off className="h-5 w-5 text-orange-500" />
                  <span className="text-orange-700 dark:text-orange-400">Verificando Conexão...</span>
                </>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                {isConnected && connectionInfo ? (
                  <p className="text-sm text-muted-foreground">
                    Conectado a <strong>{connectionInfo.url}</strong> com acesso a {connectionInfo.tables} tabelas
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Clique para verificar a conexão com o banco de dados
                  </p>
                )}
              </div>
              <Button 
                type="button"
                variant="outline" 
                size="sm"
                onClick={checkConnection}
                disabled={isCheckingConnection}
              >
                {isCheckingConnection ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                <span className="ml-2">Verificar</span>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Data Sources */}
        <Card className="border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5 text-primary" />
              Fontes de Dados
              {connectedCount > 0 && (
                <Badge variant="default" className="ml-2">
                  {connectedCount} ativa{connectedCount > 1 ? 's' : ''}
                </Badge>
              )}
            </CardTitle>
            <CardDescription>
              Ative as fontes que o agente pode consultar para responder perguntas
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!isConnected && (
              <div className="p-4 rounded-lg bg-orange-500/10 border border-orange-500/20 mb-4">
                <p className="text-sm text-orange-700 dark:text-orange-300">
                  ⚠️ Verifique a conexão com o Supabase antes de ativar as fontes de dados.
                </p>
              </div>
            )}

            <div className="grid gap-3">
              {AVAILABLE_DATA_SOURCES.map((source) => {
                const isEnabled = isSourceEnabled(source.type);
                const isSaving = savingSource === source.type;

                return (
                  <div 
                    key={source.id}
                    className={`flex items-center justify-between p-4 border rounded-lg transition-colors ${
                      isEnabled ? 'bg-primary/5 border-primary/30' : 'hover:bg-muted/50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{source.icon}</span>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{source.name}</span>
                          {isEnabled && (
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
                      {isSaving ? (
                        <Loader2 className="h-4 w-4 animate-spin text-primary" />
                      ) : (
                        <Switch
                          checked={isEnabled}
                          onCheckedChange={() => handleToggleDataSource(source)}
                          disabled={!isConnected}
                        />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
              <p className="text-sm text-blue-700 dark:text-blue-300">
                <strong>💡 Como funciona:</strong> Quando uma fonte está ativa, o agente consulta 
                automaticamente os dados atualizados do banco a cada mensagem. Isso permite respostas 
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
