import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
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
import { ScrollArea } from '@/components/ui/scroll-area';
import { triggerTypeLabels, triggerTypeDescriptions } from '@/types/followUp';
import { leadSourceLabels } from '@/types/crm';
import { X, Settings2, Filter, ListOrdered, Plus, ArrowRight } from 'lucide-react';
import type { TriggerType } from '@/types/followUp';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { FollowUpStepEditor, type FollowUpStep } from './FollowUpStepEditor';

// Etapas do pipeline
const pipelineStages = [
  { value: 'gabi_primeiro_contato', label: 'Gabi: Primeiro Contato', description: 'Lead entrou, aguardando resposta do bot', group: 'gabi' },
  { value: 'gabi_em_qualificacao', label: 'Gabi: Em Qualificação', description: 'Bot conversando, coletando informações', group: 'gabi' },
  { value: 'gabi_qualificado', label: 'Gabi: Qualificado', description: 'Bot qualificou, pronto para Round Robin', group: 'gabi' },
  { value: 'lead_novo', label: 'Lead Novo', description: 'Lead acabou de entrar, sem contato', group: 'lead' },
  { value: 'lead_contato_inicial', label: 'Contato Inicial', description: 'Primeiro contato realizado', group: 'lead' },
  { value: 'lead_qualificado', label: 'Lead Qualificado', description: 'Lead qualificado, sem negociação', group: 'lead' },
  { value: 'negociacao_andamento', label: 'Em Negociação', description: 'Negociação iniciada', group: 'negotiation' },
  { value: 'negociacao_proposta', label: 'Proposta Enviada', description: 'Aguardando retorno', group: 'negotiation' },
  { value: 'negociacao_fechamento', label: 'Fechando Negócio', description: 'Fase final de fechamento', group: 'negotiation' },
  { value: 'negociacao_pausada', label: 'Pausada', description: 'Cliente pediu tempo', group: 'negotiation' },
];

const formSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  description: z.string().optional(),
  is_active: z.boolean().default(true),
  pipeline_stages: z.array(z.string()).default([]),
  target_lead_sources: z.array(z.string()).default([]),
  trigger_type: z.string().default('no_response_to_bot'),
  priority: z.number().default(0),
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
    pipeline_stages?: string[];
  };
  onSubmit: (data: FormData & { steps: FollowUpStep[] }) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

function convertToPipelineStages(leadStatus?: string[], negotiationStatus?: string[]): string[] {
  const stages: string[] = [];
  if (leadStatus?.includes('novo')) stages.push('lead_novo');
  if (leadStatus?.includes('contato_inicial')) stages.push('lead_contato_inicial');
  if (leadStatus?.includes('qualificado')) stages.push('lead_qualificado');
  if (negotiationStatus?.includes('em_andamento')) stages.push('negociacao_andamento');
  if (negotiationStatus?.includes('proposta_enviada')) stages.push('negociacao_proposta');
  if (negotiationStatus?.includes('negociando')) stages.push('negociacao_fechamento');
  if (negotiationStatus?.includes('pausado')) stages.push('negociacao_pausada');
  return stages;
}

export function convertFromPipelineStages(pipelineStages: string[]): {
  target_lead_status: string[];
  target_negotiation_status: string[];
} {
  const leadStatus: string[] = [];
  const negotiationStatus: string[] = [];
  
  pipelineStages.forEach(stage => {
    if (stage === 'lead_novo') leadStatus.push('novo');
    if (stage === 'lead_contato_inicial') leadStatus.push('contato_inicial');
    if (stage === 'lead_qualificado') leadStatus.push('qualificado');
    if (stage === 'negociacao_andamento') negotiationStatus.push('em_andamento');
    if (stage === 'negociacao_proposta') negotiationStatus.push('proposta_enviada');
    if (stage === 'negociacao_fechamento') negotiationStatus.push('negociando');
    if (stage === 'negociacao_pausada') negotiationStatus.push('pausado');
  });
  
  return { target_lead_status: leadStatus, target_negotiation_status: negotiationStatus };
}

const defaultStep: FollowUpStep = {
  step_order: 1,
  delay_minutes: 5,
  message_template: '',
  stop_if_qualified: true,
  stop_if_assigned_to_salesperson: true,
  stop_if_responded: false,
};

export function FollowUpFlowFormNew({
  initialData,
  onSubmit,
  onCancel,
  isLoading,
}: FollowUpFlowFormNewProps) {
  const initialPipelineStages = initialData?.pipeline_stages || 
    convertToPipelineStages(initialData?.target_lead_status, initialData?.target_negotiation_status);

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
      pipeline_stages: initialPipelineStages,
      target_lead_sources: initialData?.target_lead_sources || [],
      trigger_type: initialData?.trigger_type || 'no_response_to_bot',
      priority: initialData?.priority || 0,
    },
  });

  const watchLeadSources = form.watch('target_lead_sources');
  const watchPipelineStages = form.watch('pipeline_stages');
  const watchTriggerType = form.watch('trigger_type');

  const toggleArrayValue = (
    field: 'pipeline_stages' | 'target_lead_sources',
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
        delay_minutes: prev.length === 0 ? 5 : prev[prev.length - 1].delay_minutes * 2,
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
    const converted = convertFromPipelineStages(data.pipeline_stages);
    
    onSubmit({
      ...data,
      ...converted,
      steps,
    } as never);
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
                            <Input placeholder="Ex: Reengajamento Gabi" {...field} />
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
                            <SelectItem value="no_response_to_followup">Sem resposta ao follow-up</SelectItem>
                            <SelectItem value="no_response_to_salesperson">Sem resposta ao vendedor</SelectItem>
                            
                            <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground mt-2">Baseado em Eventos</div>
                            <SelectItem value="after_lead_creation">Após criar lead</SelectItem>
                            <SelectItem value="after_status_change">Após mudança de status</SelectItem>
                            <SelectItem value="lead_stalled_in_stage">Lead parado no estágio</SelectItem>
                            <SelectItem value="after_inactivity">Após inatividade geral</SelectItem>
                            
                            <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground mt-2">Outros</div>
                            <SelectItem value="manual">Manual</SelectItem>
                            <SelectItem value="scheduled">Agendado</SelectItem>
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
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="segmentation" className="space-y-4 m-0">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Quem vai receber?</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <Label className="text-sm font-medium mb-3 block">Etapa do Pipeline</Label>
                    
                    {/* Gabi */}
                    <div className="mb-3">
                      <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                        <span className="inline-block w-2 h-2 rounded-full bg-violet-500"></span>
                        Atendimento Gabi
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {pipelineStages.filter(s => s.group === 'gabi').map((stage) => (
                          <Tooltip key={stage.value}>
                            <TooltipTrigger asChild>
                              <Badge
                                variant={watchPipelineStages.includes(stage.value) ? 'default' : 'outline'}
                                className={`cursor-pointer ${watchPipelineStages.includes(stage.value) ? 'bg-violet-600 hover:bg-violet-700' : 'border-violet-300 text-violet-700 hover:bg-violet-50'}`}
                                onClick={() => toggleArrayValue('pipeline_stages', stage.value)}
                              >
                                {stage.label.replace('Gabi: ', '')}
                                {watchPipelineStages.includes(stage.value) && <X className="h-3 w-3 ml-1" />}
                              </Badge>
                            </TooltipTrigger>
                            <TooltipContent><p>{stage.description}</p></TooltipContent>
                          </Tooltip>
                        ))}
                      </div>
                    </div>

                    {/* Leads */}
                    <div className="mb-3">
                      <p className="text-xs text-muted-foreground mb-2">Leads Manuais</p>
                      <div className="flex flex-wrap gap-2">
                        {pipelineStages.filter(s => s.group === 'lead').map((stage) => (
                          <Badge
                            key={stage.value}
                            variant={watchPipelineStages.includes(stage.value) ? 'default' : 'outline'}
                            className="cursor-pointer"
                            onClick={() => toggleArrayValue('pipeline_stages', stage.value)}
                          >
                            {stage.label}
                            {watchPipelineStages.includes(stage.value) && <X className="h-3 w-3 ml-1" />}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    {/* Negociação */}
                    <div>
                      <p className="text-xs text-muted-foreground mb-2">Em Negociação</p>
                      <div className="flex flex-wrap gap-2">
                        {pipelineStages.filter(s => s.group === 'negotiation').map((stage) => (
                          <Badge
                            key={stage.value}
                            variant={watchPipelineStages.includes(stage.value) ? 'default' : 'outline'}
                            className="cursor-pointer"
                            onClick={() => toggleArrayValue('pipeline_stages', stage.value)}
                          >
                            {stage.label}
                            {watchPipelineStages.includes(stage.value) && <X className="h-3 w-3 ml-1" />}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div>
                    <Label className="text-sm font-medium mb-2 block">Origem do Lead</Label>
                    <p className="text-xs text-muted-foreground mb-2">Deixe vazio para todos</p>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(leadSourceLabels).map(([value, label]) => (
                        <Badge
                          key={value}
                          variant={watchLeadSources.includes(value) ? 'default' : 'outline'}
                          className="cursor-pointer"
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
                  <span className="text-xs text-muted-foreground">Gatilho</span>
                  {steps.map((step, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                      <Badge variant="secondary" className="font-mono text-xs">
                        {formatDelay(step.delay_minutes)}
                      </Badge>
                    </div>
                  ))}
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
