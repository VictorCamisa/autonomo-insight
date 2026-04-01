import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
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
import { triggerTypeLabels, triggerTypeDescriptions, daysOfWeekLabels } from '@/types/followUp';
import { leadSourceLabels } from '@/types/crm';
import { X, MessageSquare, Filter, Clock, Settings2, Info } from 'lucide-react';
import type { TriggerType } from '@/types/followUp';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

// Etapas unificadas do pipeline comercial (reflete o fluxo real)
const pipelineStages = [
  // Atendimento Gabi (bot) - antes de passar para vendedor
  { value: 'gabi_primeiro_contato', label: 'Gabi: Primeiro Contato', description: 'Lead entrou, aguardando resposta do bot', group: 'gabi' },
  { value: 'gabi_em_qualificacao', label: 'Gabi: Em Qualificação', description: 'Bot conversando, coletando informações', group: 'gabi' },
  { value: 'gabi_qualificado', label: 'Gabi: Qualificado', description: 'Bot qualificou, pronto para Round Robin', group: 'gabi' },
  // Leads manuais (sem negociação)
  { value: 'lead_novo', label: 'Lead Novo', description: 'Lead acabou de entrar, sem contato', group: 'lead' },
  { value: 'lead_contato_inicial', label: 'Contato Inicial', description: 'Primeiro contato realizado', group: 'lead' },
  { value: 'lead_qualificado', label: 'Lead Qualificado', description: 'Lead qualificado, sem negociação', group: 'lead' },
  // Em negociação com vendedor
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
  target_vehicle_interests: z.string().optional(),
  trigger_type: z.string().default('manual'),
  delay_days: z.number().min(0).default(0),
  delay_hours: z.number().min(0).max(23).default(0),
  specific_time: z.string().optional(),
  days_of_week: z.array(z.number()).default([1, 2, 3, 4, 5]),
  message_template: z.string().min(1, 'Mensagem é obrigatória'),
  include_vehicle_info: z.boolean().default(false),
  include_salesperson_name: z.boolean().default(true),
  include_company_name: z.boolean().default(true),
  whatsapp_button_text: z.string().default('Enviar WhatsApp'),
  min_days_since_last_contact: z.number().min(0).optional(),
  max_contacts_per_lead: z.number().min(1).default(5),
  priority: z.number().default(0),
});

type FormData = z.infer<typeof formSchema>;

interface FollowUpFlowFormProps {
  initialData?: Partial<FormData> & {
    target_lead_status?: string[];
    target_negotiation_status?: string[];
    exclude_converted_leads?: boolean;
    exclude_lost_leads?: boolean;
  };
  onSubmit: (data: FormData) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

// Convert old format to new unified pipeline stages
function convertToPipelineStages(leadStatus?: string[], negotiationStatus?: string[]): string[] {
  const stages: string[] = [];
  
  if (leadStatus?.includes('novo')) stages.push('lead_novo');
  if (leadStatus?.includes('contato_inicial')) stages.push('lead_contato_inicial');
  if (leadStatus?.includes('qualificado')) stages.push('lead_qualificado');
  if (negotiationStatus?.includes('atendimento_ia')) stages.push('negociacao_atendimento_ia');
  if (negotiationStatus?.includes('negociando')) stages.push('negociacao_negociando');
  if (negotiationStatus?.includes('follow_up')) stages.push('negociacao_follow_up');
  if (negotiationStatus?.includes('perdido')) stages.push('negociacao_perdido');
  
  return stages;
}

// Convert unified pipeline stages back to old format for database
export function convertFromPipelineStages(pipelineStages: string[]): {
  target_lead_status: string[];
  target_negotiation_status: string[];
  exclude_converted_leads: boolean;
  exclude_lost_leads: boolean;
} {
  const leadStatus: string[] = [];
  const negotiationStatus: string[] = [];
  
  pipelineStages.forEach(stage => {
    if (stage === 'lead_novo') leadStatus.push('novo');
    if (stage === 'lead_contato_inicial') leadStatus.push('contato_inicial');
    if (stage === 'lead_qualificado') leadStatus.push('qualificado');
    if (stage === 'negociacao_atendimento_ia') negotiationStatus.push('atendimento_ia');
    if (stage === 'negociacao_negociando') negotiationStatus.push('negociando');
    if (stage === 'negociacao_follow_up') negotiationStatus.push('follow_up');
    if (stage === 'negociacao_perdido') negotiationStatus.push('perdido');
  });
  
  return {
    target_lead_status: leadStatus,
    target_negotiation_status: negotiationStatus,
    exclude_converted_leads: true,
    exclude_lost_leads: true,
  };
}

export function FollowUpFlowForm({
  initialData,
  onSubmit,
  onCancel,
  isLoading,
}: FollowUpFlowFormProps) {
  // Convert old format to new if needed
  const initialPipelineStages = initialData?.pipeline_stages || 
    convertToPipelineStages(initialData?.target_lead_status, initialData?.target_negotiation_status);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: initialData?.name || '',
      description: initialData?.description || '',
      is_active: initialData?.is_active ?? true,
      pipeline_stages: initialPipelineStages,
      target_lead_sources: initialData?.target_lead_sources || [],
      target_vehicle_interests: initialData?.target_vehicle_interests || '',
      trigger_type: initialData?.trigger_type || 'manual',
      delay_days: initialData?.delay_days || 0,
      delay_hours: initialData?.delay_hours || 0,
      specific_time: initialData?.specific_time || '',
      days_of_week: initialData?.days_of_week || [1, 2, 3, 4, 5],
      message_template: initialData?.message_template || '',
      include_vehicle_info: initialData?.include_vehicle_info ?? false,
      include_salesperson_name: initialData?.include_salesperson_name ?? true,
      include_company_name: initialData?.include_company_name ?? true,
      whatsapp_button_text: initialData?.whatsapp_button_text || 'Enviar WhatsApp',
      min_days_since_last_contact: initialData?.min_days_since_last_contact,
      max_contacts_per_lead: initialData?.max_contacts_per_lead || 5,
      priority: initialData?.priority || 0,
    },
  });

  const watchTriggerType = form.watch('trigger_type');
  const watchDaysOfWeek = form.watch('days_of_week');
  const watchLeadSources = form.watch('target_lead_sources');
  const watchPipelineStages = form.watch('pipeline_stages');

  const toggleArrayValue = (
    field: 'pipeline_stages' | 'target_lead_sources' | 'days_of_week',
    value: string | number
  ) => {
    const currentValue = form.getValues(field) as (string | number)[];
    const newValue = currentValue.includes(value)
      ? currentValue.filter((v) => v !== value)
      : [...currentValue, value];
    form.setValue(field, newValue as never);
  };

  const handleFormSubmit = (data: FormData) => {
    // Separar o campo virtual do funil para não enviar para o banco
    const { pipeline_stages, ...rest } = data;

    // Converter etapas do funil para os campos reais usados na segmentação
    const converted = convertFromPipelineStages(pipeline_stages);
    
    const finalData = {
      ...rest,
      target_lead_status: converted.target_lead_status,
      target_negotiation_status: converted.target_negotiation_status,
      exclude_converted_leads: converted.exclude_converted_leads,
      exclude_lost_leads: converted.exclude_lost_leads,
      target_vehicle_interests: rest.target_vehicle_interests
        ? rest.target_vehicle_interests.split(',').map((s) => s.trim()).filter(Boolean)
        : [],
    };
    
    onSubmit(finalData as never);
  };
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-6">
        <Tabs defaultValue="basic" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="basic" className="flex items-center gap-2">
                <Settings2 className="h-4 w-4" />
                Básico
              </TabsTrigger>
              <TabsTrigger value="segmentation" className="flex items-center gap-2">
                <Filter className="h-4 w-4" />
                Segmentação
              </TabsTrigger>
              <TabsTrigger value="timing" className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Tempo
              </TabsTrigger>
              <TabsTrigger value="message" className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                Mensagem
              </TabsTrigger>
            </TabsList>

            <TabsContent value="basic" className="space-y-4 mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Informações Básicas</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nome do Fluxo</FormLabel>
                        <FormControl>
                          <Input placeholder="Ex: Follow-up 48h após visita" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Descrição</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Descreva o objetivo deste fluxo..."
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="priority"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Prioridade</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min={0}
                              {...field}
                              onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                            />
                          </FormControl>
                          <FormDescription>Maior = mais prioritário</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="is_active"
                      render={({ field }) => (
                        <FormItem className="flex flex-col justify-center">
                          <FormLabel>Status</FormLabel>
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                            <span className="text-sm text-muted-foreground">
                              {field.value ? 'Ativo' : 'Inativo'}
                            </span>
                          </div>
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="segmentation" className="space-y-4 mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    Filtros de Segmentação
                    <Tooltip>
                      <TooltipTrigger>
                        <Info className="h-4 w-4 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        <p>Selecione em qual etapa do funil de vendas o follow-up será disparado. As etapas refletem o fluxo comercial real.</p>
                      </TooltipContent>
                    </Tooltip>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <Label className="text-sm font-medium">Etapa do Pipeline</Label>
                    <p className="text-xs text-muted-foreground mb-3">
                      Selecione as etapas do funil em que este follow-up será enviado
                    </p>
                    
                    {/* Atendimento Gabi (Bot) */}
                    <div className="mb-4">
                      <p className="text-xs text-muted-foreground mb-2 font-medium flex items-center gap-1">
                        <span className="inline-block w-2 h-2 rounded-full bg-violet-500"></span>
                        Atendimento Gabi (Bot)
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
                                {stage.label}
                                {watchPipelineStages.includes(stage.value) && (
                                  <X className="h-3 w-3 ml-1" />
                                )}
                              </Badge>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>{stage.description}</p>
                            </TooltipContent>
                          </Tooltip>
                        ))}
                      </div>
                    </div>
                    
                    {/* Leads manuais (sem negociação) */}
                    <div className="mb-4">
                      <p className="text-xs text-muted-foreground mb-2 font-medium">Leads Manuais (sem negociação)</p>
                      <div className="flex flex-wrap gap-2">
                        {pipelineStages.filter(s => s.group === 'lead').map((stage) => (
                          <Tooltip key={stage.value}>
                            <TooltipTrigger asChild>
                              <Badge
                                variant={watchPipelineStages.includes(stage.value) ? 'default' : 'outline'}
                                className="cursor-pointer"
                                onClick={() => toggleArrayValue('pipeline_stages', stage.value)}
                              >
                                {stage.label}
                                {watchPipelineStages.includes(stage.value) && (
                                  <X className="h-3 w-3 ml-1" />
                                )}
                              </Badge>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>{stage.description}</p>
                            </TooltipContent>
                          </Tooltip>
                        ))}
                      </div>
                    </div>
                    
                    {/* Leads em negociação */}
                    <div>
                      <p className="text-xs text-muted-foreground mb-2 font-medium">Em Negociação (com vendedor)</p>
                      <div className="flex flex-wrap gap-2">
                        {pipelineStages.filter(s => s.group === 'negotiation').map((stage) => (
                          <Tooltip key={stage.value}>
                            <TooltipTrigger asChild>
                              <Badge
                                variant={watchPipelineStages.includes(stage.value) ? 'default' : 'outline'}
                                className="cursor-pointer"
                                onClick={() => toggleArrayValue('pipeline_stages', stage.value)}
                              >
                                {stage.label}
                                {watchPipelineStages.includes(stage.value) && (
                                  <X className="h-3 w-3 ml-1" />
                                )}
                              </Badge>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>{stage.description}</p>
                            </TooltipContent>
                          </Tooltip>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div>
                    <Label className="text-sm font-medium">Origem do Lead</Label>
                    <p className="text-xs text-muted-foreground mb-2">
                      Filtrar por canal de aquisição (deixe vazio para todos)
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(leadSourceLabels).map(([value, label]) => (
                        <Badge
                          key={value}
                          variant={watchLeadSources.includes(value) ? 'default' : 'outline'}
                          className="cursor-pointer"
                          onClick={() => toggleArrayValue('target_lead_sources', value)}
                        >
                          {label}
                          {watchLeadSources.includes(value) && (
                            <X className="h-3 w-3 ml-1" />
                          )}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <FormField
                    control={form.control}
                    name="target_vehicle_interests"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Interesse em Veículos (opcional)</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Ex: SUV, sedan, Honda, Toyota (separado por vírgula)"
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>
                          Deixe vazio para aplicar a todos
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="timing" className="space-y-4 mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Configuração de Tempo</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="trigger_type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tipo de Gatilho</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione o gatilho" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">Gatilhos Manuais</div>
                            <SelectItem value="manual">
                              <div className="flex flex-col">
                                <span>{triggerTypeLabels.manual}</span>
                              </div>
                            </SelectItem>
                            <SelectItem value="scheduled">
                              <div className="flex flex-col">
                                <span>{triggerTypeLabels.scheduled}</span>
                              </div>
                            </SelectItem>
                            
                            <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground mt-2">Sem Resposta</div>
                            <SelectItem value="no_response_to_bot">
                              <div className="flex flex-col">
                                <span>{triggerTypeLabels.no_response_to_bot}</span>
                              </div>
                            </SelectItem>
                            <SelectItem value="no_response_to_followup">
                              <div className="flex flex-col">
                                <span>{triggerTypeLabels.no_response_to_followup}</span>
                              </div>
                            </SelectItem>
                            <SelectItem value="no_response_to_salesperson">
                              <div className="flex flex-col">
                                <span>{triggerTypeLabels.no_response_to_salesperson}</span>
                              </div>
                            </SelectItem>
                            
                            <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground mt-2">Baseado em Eventos</div>
                            <SelectItem value="after_lead_creation">
                              <div className="flex flex-col">
                                <span>{triggerTypeLabels.after_lead_creation}</span>
                              </div>
                            </SelectItem>
                            <SelectItem value="after_status_change">
                              <div className="flex flex-col">
                                <span>{triggerTypeLabels.after_status_change}</span>
                              </div>
                            </SelectItem>
                            <SelectItem value="after_inactivity">
                              <div className="flex flex-col">
                                <span>{triggerTypeLabels.after_inactivity}</span>
                              </div>
                            </SelectItem>
                            <SelectItem value="lead_stalled_in_stage">
                              <div className="flex flex-col">
                                <span>{triggerTypeLabels.lead_stalled_in_stage}</span>
                              </div>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                        {field.value && (
                          <FormDescription className="text-xs">
                            {triggerTypeDescriptions[field.value as keyof typeof triggerTypeDescriptions]}
                          </FormDescription>
                        )}
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {(watchTriggerType === 'after_lead_creation' ||
                    watchTriggerType === 'after_status_change' ||
                    watchTriggerType === 'after_inactivity' ||
                    watchTriggerType === 'no_response_to_bot' ||
                    watchTriggerType === 'no_response_to_followup' ||
                    watchTriggerType === 'no_response_to_salesperson' ||
                    watchTriggerType === 'lead_stalled_in_stage') && (
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="delay_days"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Dias de Espera</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                min={0}
                                {...field}
                                onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="delay_hours"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Horas de Espera</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                min={0}
                                max={23}
                                {...field}
                                onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  )}

                  {watchTriggerType === 'scheduled' && (
                    <>
                      <FormField
                        control={form.control}
                        name="specific_time"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Horário Específico</FormLabel>
                            <FormControl>
                              <Input type="time" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div>
                        <Label className="text-sm font-medium">Dias da Semana</Label>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {Object.entries(daysOfWeekLabels).map(([day, label]) => (
                            <Badge
                              key={day}
                              variant={watchDaysOfWeek.includes(parseInt(day)) ? 'default' : 'outline'}
                              className="cursor-pointer"
                              onClick={() => toggleArrayValue('days_of_week', parseInt(day))}
                            >
                              {label}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="min_days_since_last_contact"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Mín. dias desde último contato</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min={0}
                              placeholder="Opcional"
                              {...field}
                              value={field.value ?? ''}
                              onChange={(e) =>
                                field.onChange(e.target.value ? parseInt(e.target.value) : undefined)
                              }
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="max_contacts_per_lead"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Máx. contatos por lead</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min={1}
                              {...field}
                              onChange={(e) => field.onChange(parseInt(e.target.value) || 5)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="message" className="space-y-4 mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Configuração da Mensagem</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="message_template"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Template da Mensagem</FormLabel>
                        <FormControl>
                          <Textarea
                            rows={6}
                            placeholder="Olá {nome}! Tudo bem? Vi que você demonstrou interesse em {veiculo_interesse}. Gostaria de agendar uma visita para conhecer nossas opções?"
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>
                          Variáveis disponíveis: {'{nome}'}, {'{telefone}'}, {'{email}'}, {'{veiculo_interesse}'}, {'{vendedor}'}, {'{empresa}'}
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="whatsapp_button_text"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Texto do Botão WhatsApp</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="space-y-3">
                    <Label className="text-sm font-medium">Incluir na Mensagem</Label>
                    
                    <FormField
                      control={form.control}
                      name="include_salesperson_name"
                      render={({ field }) => (
                        <FormItem className="flex items-center gap-2">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <FormLabel className="!mt-0">Nome do vendedor</FormLabel>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="include_company_name"
                      render={({ field }) => (
                        <FormItem className="flex items-center gap-2">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <FormLabel className="!mt-0">Nome da empresa</FormLabel>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="include_vehicle_info"
                      render={({ field }) => (
                        <FormItem className="flex items-center gap-2">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <FormLabel className="!mt-0">Informações do veículo de interesse</FormLabel>
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Salvando...' : initialData?.name ? 'Atualizar' : 'Criar Fluxo'}
            </Button>
          </div>
      </form>
    </Form>
  );
}
