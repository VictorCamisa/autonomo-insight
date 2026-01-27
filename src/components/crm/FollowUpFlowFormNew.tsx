import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
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
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { triggerTypeDescriptions } from '@/types/followUp';
import { leadSourceLabels } from '@/types/crm';
import { 
  X, Settings2, Filter, ListOrdered, Plus, ArrowRight, MessageCircle, 
  Bot, Handshake, Trophy, Clock, XCircle, Target, Zap, AlertTriangle,
  User, Bell
} from 'lucide-react';
import type { TriggerType } from '@/types/followUp';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { FollowUpStepEditor, type FollowUpStep } from './FollowUpStepEditor';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

// Hook para buscar instâncias WhatsApp
function useWhatsAppInstances() {
  return useQuery({
    queryKey: ['whatsapp-instances'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('whatsapp_instances')
        .select('id, instance_name, status, is_default')
        .order('is_default', { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

// Etapas REAIS do pipeline (alinhado com NegotiationStatus)
const negotiationStages = [
  { 
    value: 'atendimento_ia', 
    label: 'Em Atendimento IA', 
    description: 'Lead sendo atendido pela Gabi (bot)', 
    icon: Bot,
    color: 'blue'
  },
  { 
    value: 'negociando', 
    label: 'Negociando', 
    description: 'Lead qualificado, em negociação com vendedor', 
    icon: Handshake,
    color: 'amber'
  },
  { 
    value: 'follow_up', 
    label: 'Follow-up', 
    description: 'Lead sem resposta há mais de 24h', 
    icon: Clock,
    color: 'orange'
  },
  { 
    value: 'perdido', 
    label: 'Perdido', 
    description: 'Lead marcado como perdido, pode ser reativado', 
    icon: XCircle,
    color: 'red'
  },
];

// Ações de fim de ciclo
export type EndCycleAction = 'none' | 'mark_lost' | 'notify_manager' | 'move_to_manual' | 'restart_cycle';

const endCycleActions = [
  { 
    value: 'none', 
    label: 'Nenhuma', 
    description: 'Apenas finaliza o fluxo sem ação adicional',
    icon: XCircle
  },
  { 
    value: 'mark_lost', 
    label: 'Marcar como Perdido', 
    description: 'Move a negociação para status "Perdido" automaticamente',
    icon: Target
  },
  { 
    value: 'notify_manager', 
    label: 'Notificar Gerente', 
    description: 'Envia alerta para o gerente/admin revisar manualmente',
    icon: Bell
  },
  { 
    value: 'move_to_manual', 
    label: 'Passar para Vendedor', 
    description: 'Move para "Negociando" para tentativa manual',
    icon: User
  },
  { 
    value: 'restart_cycle', 
    label: 'Reiniciar Ciclo', 
    description: 'Aguarda X dias e reinicia o fluxo (máx 3 vezes)',
    icon: Zap
  },
];

const formSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  description: z.string().optional(),
  is_active: z.boolean().default(true),
  target_negotiation_status: z.array(z.string()).default([]),
  target_lead_sources: z.array(z.string()).default([]),
  trigger_type: z.string().default('no_response_to_bot'),
  priority: z.number().default(0),
  whatsapp_instance_id: z.string().optional().nullable(),
  end_cycle_action: z.string().default('none'),
  end_cycle_days_before_restart: z.number().optional(),
});

type FormData = z.infer<typeof formSchema>;

export interface FollowUpFlowFormNewProps {
  initialData?: {
    id?: string;
    name?: string;
    description?: string;
    is_active?: boolean;
    target_lead_status?: string[];
    target_lead_sources?: string[];
    target_negotiation_status?: string[];
    trigger_type?: string;
    priority?: number;
    steps?: FollowUpStep[];
    whatsapp_instance_id?: string | null;
    end_cycle_action?: string;
    end_cycle_days_before_restart?: number;
  };
  onSubmit: (data: FormData & { steps: FollowUpStep[] }) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

const defaultStep: FollowUpStep = {
  step_order: 1,
  delay_minutes: 1440, // 24h padrão
  message_template: '',
  stop_if_qualified: true,
  stop_if_assigned_to_salesperson: false,
  stop_if_responded: true,
};

export function FollowUpFlowFormNew({
  initialData,
  onSubmit,
  onCancel,
  isLoading,
}: FollowUpFlowFormNewProps) {
  const { data: whatsappInstances } = useWhatsAppInstances();

  const [steps, setSteps] = useState<FollowUpStep[]>(
    initialData?.steps && initialData.steps.length > 0
      ? initialData.steps
      : [{ ...defaultStep }]
  );

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: initialData?.name || '',
      description: initialData?.description || '',
      is_active: initialData?.is_active ?? true,
      target_negotiation_status: initialData?.target_negotiation_status || ['follow_up'],
      target_lead_sources: initialData?.target_lead_sources || [],
      trigger_type: initialData?.trigger_type || 'no_response_to_bot',
      priority: initialData?.priority || 0,
      whatsapp_instance_id: initialData?.whatsapp_instance_id || null,
      end_cycle_action: initialData?.end_cycle_action || 'none',
      end_cycle_days_before_restart: initialData?.end_cycle_days_before_restart || 7,
    },
  });

  const watchLeadSources = form.watch('target_lead_sources') || [];
  const watchNegotiationStatus = form.watch('target_negotiation_status') || [];
  const watchEndCycleAction = form.watch('end_cycle_action') || 'none';

  const toggleArrayValue = (
    field: 'target_negotiation_status' | 'target_lead_sources',
    value: string
  ) => {
    const currentValue = form.getValues(field) as string[];
    const newValue = currentValue.includes(value)
      ? currentValue.filter((v) => v !== value)
      : [...currentValue, value];
    form.setValue(field, newValue);
  };

  const addStep = () => {
    setSteps(prev => [
      ...prev,
      {
        ...defaultStep,
        step_order: prev.length + 1,
        delay_minutes: prev.length === 0 ? 1440 : prev[prev.length - 1].delay_minutes * 2,
      },
    ]);
  };

  const removeStep = (index: number) => {
    setSteps(prev => prev.filter((_, i) => i !== index).map((s, i) => ({ ...s, step_order: i + 1 })));
  };

  const updateStep = (index: number, step: FollowUpStep) => {
    setSteps(prev => prev.map((s, i) => (i === index ? { ...step, step_order: i + 1 } : s)));
  };

  const handleFormSubmit = (data: FormData) => {
    onSubmit({
      ...data,
      steps,
    } as FormData & { steps: FollowUpStep[] });
  };

  // Helper para formatar tempo
  const formatDelay = (minutes: number): string => {
    if (minutes < 60) return `${minutes}min`;
    if (minutes < 1440) {
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      return mins > 0 ? `${hours}h${mins}m` : `${hours}h`;
    }
    const days = Math.floor(minutes / 1440);
    return `${days}d`;
  };

  const getStageColor = (color: string, isSelected: boolean) => {
    if (!isSelected) return 'border-border hover:bg-muted/50';
    
    switch (color) {
      case 'blue':
        return 'bg-blue-100 dark:bg-blue-950 border-blue-500 text-blue-700 dark:text-blue-300';
      case 'amber':
        return 'bg-amber-100 dark:bg-amber-950 border-amber-500 text-amber-700 dark:text-amber-300';
      case 'orange':
        return 'bg-orange-100 dark:bg-orange-950 border-orange-500 text-orange-700 dark:text-orange-300';
      case 'red':
        return 'bg-red-100 dark:bg-red-950 border-red-500 text-red-700 dark:text-red-300';
      default:
        return 'bg-primary text-primary-foreground';
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4 max-h-[80vh] flex flex-col">
        <Tabs defaultValue="config" className="w-full flex-1 flex flex-col min-h-0">
          <TabsList className="grid w-full grid-cols-3 shrink-0">
            <TabsTrigger value="config" className="flex items-center gap-2">
              <Settings2 className="h-4 w-4" />
              Configuração
            </TabsTrigger>
            <TabsTrigger value="segmentation" className="flex items-center gap-2">
              <Filter className="h-4 w-4" />
              Segmentação
            </TabsTrigger>
            <TabsTrigger value="steps" className="flex items-center gap-2">
              <ListOrdered className="h-4 w-4" />
              Passos ({steps.length})
            </TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-auto mt-4">
            <TabsContent value="config" className="space-y-4 m-0">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Informações do Fluxo</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nome</FormLabel>
                          <FormControl>
                            <Input placeholder="Ex: Reengajamento 72h" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="is_active"
                      render={({ field }) => (
                        <FormItem className="flex flex-col justify-end">
                          <FormLabel>Status</FormLabel>
                          <div className="flex items-center gap-2 h-10">
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                            <span className="text-sm">
                              {field.value ? 'Ativo' : 'Inativo'}
                            </span>
                          </div>
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Descrição</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Descreva o objetivo deste fluxo..."
                            className="resize-none"
                            rows={2}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="trigger_type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Gatilho</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione o gatilho" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">Sem Resposta</div>
                            <SelectItem value="no_response_to_bot">Sem resposta à Gabi (bot)</SelectItem>
                            <SelectItem value="no_response_to_followup">Sem resposta ao follow-up anterior</SelectItem>
                            <SelectItem value="no_response_to_salesperson">Sem resposta ao vendedor</SelectItem>
                            
                            <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground mt-2">Baseado em Tempo</div>
                            <SelectItem value="after_inactivity">Após X tempo sem atividade</SelectItem>
                            <SelectItem value="lead_stalled_in_stage">Lead parado no estágio</SelectItem>
                            
                            <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground mt-2">Outros</div>
                            <SelectItem value="manual">Manual</SelectItem>
                          </SelectContent>
                        </Select>
                        {field.value && triggerTypeDescriptions[field.value as TriggerType] && (
                          <FormDescription className="text-xs">
                            {triggerTypeDescriptions[field.value as TriggerType]}
                          </FormDescription>
                        )}
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="whatsapp_instance_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          <MessageCircle className="h-4 w-4" />
                          Instância WhatsApp
                        </FormLabel>
                        <Select 
                          onValueChange={(value) => field.onChange(value === 'auto' ? null : value)} 
                          defaultValue={field.value || 'auto'}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione a instância" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="auto">
                              Automático (primeira conectada)
                            </SelectItem>
                            {whatsappInstances?.map((instance) => (
                              <SelectItem key={instance.id} value={instance.id}>
                                <div className="flex items-center gap-2">
                                  <span className={`w-2 h-2 rounded-full ${instance.status === 'connected' ? 'bg-green-500' : 'bg-gray-400'}`} />
                                  {instance.instance_name}
                                  {instance.is_default && <Badge variant="secondary" className="text-[10px] py-0">Padrão</Badge>}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormDescription className="text-xs">
                          Escolha qual instância será usada para enviar as mensagens
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="segmentation" className="space-y-4 m-0">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Target className="h-4 w-4" />
                    Quem vai receber?
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Estágio do Pipeline */}
                  <div>
                    <Label className="text-sm font-medium mb-3 block">Estágio da Negociação</Label>
                    <p className="text-xs text-muted-foreground mb-3">
                      Selecione em quais estágios do pipeline este fluxo deve atuar
                    </p>
                    <div className="grid grid-cols-1 gap-2">
                      {negotiationStages.map((stage) => {
                        const Icon = stage.icon;
                        const isSelected = watchNegotiationStatus.includes(stage.value);
                        return (
                          <div
                            key={stage.value}
                            onClick={() => toggleArrayValue('target_negotiation_status', stage.value)}
                            className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${getStageColor(stage.color, isSelected)}`}
                          >
                            <Icon className="h-5 w-5 shrink-0" />
                            <div className="flex-1">
                              <p className="font-medium text-sm">{stage.label}</p>
                              <p className="text-xs opacity-75">{stage.description}</p>
                            </div>
                            {isSelected && (
                              <Badge variant="secondary" className="shrink-0">
                                Selecionado
                              </Badge>
                            )}
                          </div>
                        );
                      })}
                    </div>
                    
                    {watchNegotiationStatus.length === 0 && (
                      <div className="flex items-center gap-2 mt-3 p-2 bg-amber-50 dark:bg-amber-950/50 rounded-lg border border-amber-200 dark:border-amber-800">
                        <AlertTriangle className="h-4 w-4 text-amber-600" />
                        <p className="text-xs text-amber-700 dark:text-amber-300">
                          Selecione ao menos um estágio para o fluxo funcionar
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Origem do Lead */}
                  <div>
                    <Label className="text-sm font-medium mb-2 block">Origem do Lead</Label>
                    <p className="text-xs text-muted-foreground mb-3">
                      Deixe vazio para aplicar a todas as origens
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(leadSourceLabels).map(([value, label]) => (
                        <Badge
                          key={value}
                          variant={watchLeadSources.includes(value) ? 'default' : 'outline'}
                          className="cursor-pointer transition-all hover:scale-105"
                          onClick={() => toggleArrayValue('target_lead_sources', value)}
                        >
                          {label}
                          {watchLeadSources.includes(value) && <X className="h-3 w-3 ml-1" />}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="steps" className="space-y-4 m-0">
              {/* Visualização da sequência */}
              {steps.length > 0 && (
                <div className="flex items-center gap-2 flex-wrap p-3 bg-muted/50 rounded-lg">
                  <span className="text-xs text-muted-foreground font-medium">Sequência:</span>
                  <Badge variant="outline" className="font-mono text-xs">
                    Gatilho
                  </Badge>
                  {steps.map((step, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                      <Badge variant="secondary" className="font-mono text-xs">
                        {formatDelay(step.delay_minutes)}
                      </Badge>
                    </div>
                  ))}
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  <Badge variant="outline" className="font-mono text-xs bg-orange-100 dark:bg-orange-950 border-orange-300">
                    Fim
                  </Badge>
                </div>
              )}

              {/* Editor de passos */}
              <div className="space-y-3">
                {steps.map((step, index) => (
                  <FollowUpStepEditor
                    key={index}
                    step={step}
                    stepIndex={index}
                    onChange={(updatedStep) => updateStep(index, updatedStep)}
                    onRemove={() => removeStep(index)}
                    canRemove={steps.length > 1}
                  />
                ))}
              </div>

              <Button
                type="button"
                variant="outline"
                onClick={addStep}
                className="w-full"
              >
                <Plus className="h-4 w-4 mr-2" />
                Adicionar Passo
              </Button>

              {/* Ação de fim de ciclo */}
              <Card className="border-orange-200 dark:border-orange-800 bg-orange-50/50 dark:bg-orange-950/20">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Zap className="h-4 w-4 text-orange-600" />
                    Ação ao Finalizar Ciclo
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-xs text-muted-foreground">
                    O que fazer quando todos os passos forem executados e o lead ainda não respondeu?
                  </p>
                  
                  <FormField
                    control={form.control}
                    name="end_cycle_action"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <RadioGroup
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                            className="space-y-2"
                          >
                            {endCycleActions.map((action) => {
                              const Icon = action.icon;
                              return (
                                <div
                                  key={action.value}
                                  className={`flex items-center space-x-3 p-3 rounded-lg border transition-all cursor-pointer ${
                                    field.value === action.value 
                                      ? 'border-primary bg-primary/5' 
                                      : 'border-border hover:bg-muted/50'
                                  }`}
                                  onClick={() => field.onChange(action.value)}
                                >
                                  <RadioGroupItem value={action.value} id={action.value} />
                                  <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
                                  <div className="flex-1">
                                    <Label 
                                      htmlFor={action.value}
                                      className="font-medium text-sm cursor-pointer"
                                    >
                                      {action.label}
                                    </Label>
                                    <p className="text-xs text-muted-foreground">
                                      {action.description}
                                    </p>
                                  </div>
                                </div>
                              );
                            })}
                          </RadioGroup>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {watchEndCycleAction === 'restart_cycle' && (
                    <FormField
                      control={form.control}
                      name="end_cycle_days_before_restart"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Dias antes de reiniciar</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min={1}
                              max={30}
                              {...field}
                              onChange={(e) => field.onChange(parseInt(e.target.value) || 7)}
                              className="w-24"
                            />
                          </FormControl>
                          <FormDescription className="text-xs">
                            O fluxo reiniciará no máximo 3 vezes antes de parar definitivamente
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </div>
        </Tabs>

        {/* Footer */}
        <div className="flex justify-end gap-2 pt-4 border-t shrink-0">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? 'Salvando...' : initialData?.id ? 'Atualizar' : 'Criar Fluxo'}
          </Button>
        </div>
      </form>
    </Form>
  );
}

// Export for backwards compatibility
export function convertFromPipelineStages(pipelineStages: string[]): {
  target_lead_status: string[];
  target_negotiation_status: string[];
} {
  // Legacy conversion - just pass through negotiation status
  return { 
    target_lead_status: [], 
    target_negotiation_status: pipelineStages.filter(s => 
      ['atendimento_ia', 'negociando', 'follow_up'].includes(s)
    )
  };
}
