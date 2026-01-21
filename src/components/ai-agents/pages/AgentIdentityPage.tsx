import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { ChevronLeft, ChevronRight, User, MessageSquare } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';

import { useAIAgent, useUpdateAIAgent } from '@/hooks/useAIAgents';
import { GENDER_OPTIONS, TONE_OPTIONS } from '@/types/ai-agents';

// Form schema
const formSchema = z.object({
  display_name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  gender: z.enum(['male', 'female', 'neutral']),
  tone: z.enum(['friendly', 'professional', 'informal', 'formal']),
  welcome_message: z.string().optional(),
  // Special instructions
  be_brief: z.boolean().default(true),
  use_emojis: z.boolean().default(true),
  always_confirm: z.boolean().default(false),
  collect_data_tags: z.boolean().default(true),
  photo_instructions: z.string().optional(),
  year_matching_instructions: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

export default function AgentIdentityPage() {
  const { agentId } = useParams();
  const navigate = useNavigate();
  
  const { data: agent, isLoading } = useAIAgent(agentId);
  const updateMutation = useUpdateAIAgent();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      display_name: '',
      gender: 'female',
      tone: 'friendly',
      welcome_message: '',
      be_brief: true,
      use_emojis: true,
      always_confirm: false,
      collect_data_tags: true,
      photo_instructions: '',
      year_matching_instructions: '',
    },
  });

  // Populate form with existing data
  useEffect(() => {
    if (agent) {
      const specialInstructions = (agent as any).special_instructions || {};
      
      form.reset({
        display_name: (agent as any).display_name || agent.name || '',
        gender: (agent as any).gender || 'female',
        tone: (agent as any).tone || 'friendly',
        welcome_message: (agent as any).welcome_message || '',
        be_brief: specialInstructions.be_brief ?? true,
        use_emojis: specialInstructions.use_emojis ?? true,
        always_confirm: specialInstructions.always_confirm ?? false,
        collect_data_tags: specialInstructions.collect_data_tags ?? true,
        photo_instructions: specialInstructions.photo_instructions || '',
        year_matching_instructions: specialInstructions.year_matching_instructions || '',
      });
    }
  }, [agent, form]);

  if (!agentId) {
    return (
      <div className="p-6">
        <p className="text-destructive">ID do agente não encontrado</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  const onSubmit = async (data: FormData) => {
    const special_instructions = {
      be_brief: data.be_brief,
      use_emojis: data.use_emojis,
      always_confirm: data.always_confirm,
      collect_data_tags: data.collect_data_tags,
      photo_instructions: data.photo_instructions,
      year_matching_instructions: data.year_matching_instructions,
    };

    await updateMutation.mutateAsync({
      id: agentId,
      data: {
        display_name: data.display_name,
        gender: data.gender,
        tone: data.tone,
        welcome_message: data.welcome_message || null,
        special_instructions,
      } as any,
    });

    navigate(`/ai-agents/${agentId}/llm`);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <User className="h-6 w-6 text-primary" />
          Identidade do Agente
        </h1>
        <p className="text-muted-foreground">
          Configure como o agente se apresenta e se comunica com os clientes.
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Identity Section */}
          <Card>
            <CardHeader>
              <CardTitle>Personalidade</CardTitle>
              <CardDescription>
                Defina como o agente vai se apresentar e falar com os clientes
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-3">
                <FormField
                  control={form.control}
                  name="display_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome de Apresentação</FormLabel>
                      <FormControl>
                        <Input placeholder="Gabi" {...field} />
                      </FormControl>
                      <FormDescription>
                        Nome que o agente usará para se apresentar
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="gender"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Gênero</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {GENDER_OPTIONS.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Afeta a linguagem usada (obrigado/obrigada)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="tone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tom de Voz</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {TONE_OPTIONS.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Define o estilo de comunicação
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="welcome_message"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mensagem de Boas-Vindas</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Oii! Sou a Gabi da Matheus Veículos 🚗&#10;&#10;O que você está buscando hoje?"
                        className="min-h-[100px]"
                        {...field} 
                      />
                    </FormControl>
                    <FormDescription>
                      Mensagem enviada quando o cliente inicia a conversa (oi, olá, bom dia, etc)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Communication Rules */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Regras de Comunicação
              </CardTitle>
              <CardDescription>
                Configure como o agente deve se comunicar
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="be_brief"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Ser Breve</FormLabel>
                        <FormDescription>
                          Limitar respostas a 2-3 frases
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="use_emojis"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Usar Emojis</FormLabel>
                        <FormDescription>
                          Incluir emojis nas mensagens
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="always_confirm"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Confirmar Entendimento</FormLabel>
                        <FormDescription>
                          Sempre confirmar o que o cliente disse
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="collect_data_tags"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Coletar Dados (Tags)</FormLabel>
                        <FormDescription>
                          Extrair [DADO:xxx] das conversas
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          {/* Special Instructions */}
          <Card>
            <CardHeader>
              <CardTitle>Instruções Especiais</CardTitle>
              <CardDescription>
                Regras específicas para situações comuns
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="photo_instructions"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Regras de Fotos</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Se pedirem foto de um veículo, localize o veículo EXATO no estoque. Se não tiver foto, diga que não tem disponível."
                        className="min-h-[80px]"
                        {...field} 
                      />
                    </FormControl>
                    <FormDescription>
                      Como o agente deve lidar com pedidos de fotos
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="year_matching_instructions"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Regras de Ano do Veículo</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Se o cliente pedir um ano específico que não temos, sugira anos próximos (±2 anos). Nunca diga apenas 'não temos'."
                        className="min-h-[80px]"
                        {...field} 
                      />
                    </FormControl>
                    <FormDescription>
                      Como lidar quando não temos o ano exato pedido
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Navigation */}
          <div className="flex justify-between pt-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate(`/ai-agents/${agentId}/basico`)}
              className="gap-2"
            >
              <ChevronLeft className="h-4 w-4" />
              Voltar: Básico
            </Button>
            <Button
              type="submit"
              disabled={updateMutation.isPending}
              className="gap-2"
            >
              {updateMutation.isPending ? 'Salvando...' : 'Salvar e Continuar'}
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
