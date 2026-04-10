import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { useLeads } from '@/hooks/useLeads';
import { useVehicles } from '@/hooks/useVehicles';
import { useUsersWithRoles } from '@/hooks/useUsers';
import { useAuth } from '@/contexts/AuthContext';
import { negotiationStatusLabels, pipelineColumns, lossReasonLabels, objectionOptions } from '@/types/negotiations';
import type { Negotiation, NegotiationStatus, LossReasonType } from '@/types/negotiations';
import { Calendar, Clock, Lock, User, UserCheck, AlertCircle, Trash2, Car, Check, ChevronsUpDown, Plus } from 'lucide-react';
import { useFormPersistence, useFormLeaveWarning } from '@/hooks/useFormPersistence';
import { cn } from '@/lib/utils';

const negotiationFormSchema = z.object({
  lead_id: z.string().min(1, 'Selecione um lead'),
  vehicle_id: z.string().optional(),
  salesperson_id: z.string().min(1, 'Selecione um vendedor'),
  status: z.enum(['atendimento_ia', 'negociando', 'ganho', 'perdido'] as const),
  estimated_value: z.string().optional(),
  probability: z.string().optional(),
  expected_close_date: z.string().optional(),
  loss_reason: z.string().optional(),
  structured_loss_reason: z.enum(['sem_entrada', 'sem_credito', 'curioso', 'caro', 'comprou_outro', 'desistiu', 'sem_contato', 'veiculo_vendido', 'outros'] as const).optional(),
  notes: z.string().optional(),
  appointment_date: z.string().optional(),
  appointment_time: z.string().optional(),
  showed_up: z.boolean().optional(),
  objections: z.array(z.string()).optional(),
});

type NegotiationFormValues = z.infer<typeof negotiationFormSchema>;

interface NegotiationFormProps {
  negotiation?: Negotiation;
  onSubmit: (data: NegotiationFormValues) => void;
  isLoading?: boolean;
  onCreateLead?: () => void;
}

export function NegotiationForm({ negotiation, onSubmit, isLoading, onCreateLead }: NegotiationFormProps) {
  const { role } = useAuth();
  const { data: leads = [] } = useLeads();
  const { data: vehicles = [] } = useVehicles();
  const { data: users = [] } = useUsersWithRoles();
  const [vehicleOpen, setVehicleOpen] = useState(false);
  const [leadOpen, setLeadOpen] = useState(false);

  const isManager = role === 'gerente';
  const isEditing = !!negotiation?.id;
  const storageKey = isEditing ? `negotiation_edit_${negotiation.id}` : 'negotiation_create';

  const availableVehicles = vehicles.filter(v => v.status === 'disponivel' || v.id === negotiation?.vehicle_id);
  
  // Filter to only show active users with vendedor or gerente role
  const salespeople = users.filter(u => 
    u.is_active && (u.roles.includes('vendedor') || u.roles.includes('gerente'))
  );

  const form = useForm<NegotiationFormValues>({
    resolver: zodResolver(negotiationFormSchema),
    defaultValues: {
      lead_id: negotiation?.lead_id || '',
      vehicle_id: negotiation?.vehicle_id || '',
      salesperson_id: negotiation?.salesperson_id || '',
      status: negotiation?.status || 'atendimento_ia',
      estimated_value: negotiation?.estimated_value?.toString() || '',
      probability: negotiation?.probability?.toString() || '',
      expected_close_date: negotiation?.expected_close_date || '',
      loss_reason: negotiation?.loss_reason || '',
      structured_loss_reason: negotiation?.structured_loss_reason || undefined,
      notes: negotiation?.notes || '',
      appointment_date: negotiation?.appointment_date || '',
      appointment_time: negotiation?.appointment_time || '',
      showed_up: negotiation?.showed_up ?? undefined,
      objections: negotiation?.objections || [],
    },
  });

  // Persistir formulário
  const { clearDraft, hasDraft, discardDraft } = useFormPersistence({
    form,
    key: storageKey,
  });

  // Alertar ao sair com alterações não salvas
  useFormLeaveWarning(form.formState.isDirty);

  // Handler de submit que limpa o rascunho após sucesso
  const handleSubmit = (data: NegotiationFormValues) => {
    onSubmit(data);
    clearDraft();
  };

  const watchStatus = form.watch('status');
  const watchAppointmentDate = form.watch('appointment_date');
  const watchLeadId = form.watch('lead_id');
  const watchVehicleId = form.watch('vehicle_id');
  const showDraftAlert = hasDraft() && !isEditing;

  // Auto-fill salesperson when selecting a lead (only on creation)
  useEffect(() => {
    if (watchLeadId && !isEditing) {
      const selectedLead = leads.find(l => l.id === watchLeadId);
      if (selectedLead?.assigned_to) {
        form.setValue('salesperson_id', selectedLead.assigned_to);
      }
    }
  }, [watchLeadId, leads, form, isEditing]);

  // Auto-fill estimated value when selecting a vehicle
  useEffect(() => {
    if (watchVehicleId && watchVehicleId !== 'none') {
      const selectedVehicle = vehicles.find(v => v.id === watchVehicleId);
      if (selectedVehicle?.sale_price) {
        form.setValue('estimated_value', selectedVehicle.sale_price.toString());
      }
    }
  }, [watchVehicleId, vehicles, form]);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        {/* Alerta de rascunho recuperado */}
        {showDraftAlert && (
          <Alert className="border-amber-500/50 bg-amber-500/10">
            <AlertCircle className="h-4 w-4 text-amber-500" />
            <AlertDescription className="flex items-center justify-between">
              <span className="text-sm">Rascunho recuperado.</span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={discardDraft}
                className="h-8 text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Descartar
              </Button>
            </AlertDescription>
          </Alert>
        )}
        <FormField
          control={form.control}
          name="lead_id"
          render={({ field }) => {
            const selectedLead = leads.find(l => l.id === field.value);
            return (
              <FormItem className="flex flex-col">
                <FormLabel>Lead *</FormLabel>
                <Popover open={leadOpen} onOpenChange={setLeadOpen}>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={leadOpen}
                        disabled={!!negotiation}
                        className={cn(
                          "w-full justify-between font-normal",
                          !field.value && "text-muted-foreground"
                        )}
                      >
                        {selectedLead ? (
                          <span className="truncate">{selectedLead.name} - {selectedLead.phone}</span>
                        ) : "Buscar lead..."}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                    <Command>
                      <CommandInput placeholder="Buscar por nome, telefone ou email..." />
                      <CommandList>
                        <CommandEmpty>
                          <div className="py-2 text-center">
                            <p className="text-sm text-muted-foreground mb-2">Nenhum lead encontrado.</p>
                            {onCreateLead && (
                              <Button
                                type="button"
                                size="sm"
                                onClick={() => {
                                  setLeadOpen(false);
                                  onCreateLead();
                                }}
                              >
                                <Plus className="h-4 w-4 mr-1" />
                                Cadastrar Novo Lead
                              </Button>
                            )}
                          </div>
                        </CommandEmpty>
                        <CommandGroup>
                          {leads.map((lead) => (
                            <CommandItem
                              key={lead.id}
                              value={`${lead.name} ${lead.phone} ${lead.email || ''}`}
                              onSelect={() => {
                                field.onChange(lead.id);
                                setLeadOpen(false);
                              }}
                            >
                              <Check className={cn("mr-2 h-4 w-4", field.value === lead.id ? "opacity-100" : "opacity-0")} />
                              <div className="flex flex-col">
                                <span>{lead.name}</span>
                                <span className="text-xs text-muted-foreground">{lead.phone}</span>
                              </div>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                      {onCreateLead && (
                        <div className="border-t p-2">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="w-full justify-start"
                            onClick={() => {
                              setLeadOpen(false);
                              onCreateLead();
                            }}
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            Cadastrar Novo Lead
                          </Button>
                        </div>
                      )}
                    </Command>
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            );
          }}
        />

        <FormField
          control={form.control}
          name="salesperson_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="flex items-center gap-2">
                <User className="h-4 w-4" />
                Vendedor Responsável *
                {!isManager && isEditing && (
                  <Lock className="h-3 w-3 text-muted-foreground" />
                )}
              </FormLabel>
              <Select 
                onValueChange={field.onChange} 
                value={field.value}
                disabled={!isManager && isEditing}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o vendedor" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {salespeople.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.full_name || user.email || 'Sem nome'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {!isManager && isEditing && (
                <p className="text-xs text-muted-foreground">
                  Somente gerentes podem alterar o vendedor responsável
                </p>
              )}
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="vehicle_id"
          render={({ field }) => {
            const selectedVehicle = availableVehicles.find((v) => v.id === field.value);
            return (
              <FormItem className="flex flex-col">
                <FormLabel>Veículo de Interesse</FormLabel>
                <Popover open={vehicleOpen} onOpenChange={setVehicleOpen}>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={vehicleOpen}
                        className={cn(
                          "w-full justify-between font-normal",
                          !field.value && "text-muted-foreground"
                        )}
                      >
                        {selectedVehicle
                          ? `${selectedVehicle.brand} ${selectedVehicle.model} - ${selectedVehicle.plate || 'Sem placa'}`
                          : "Nenhum veículo selecionado"}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-[400px] p-0" align="start">
                    <Command>
                      <CommandInput placeholder="Buscar por marca, modelo ou placa..." />
                      <CommandList>
                        <CommandEmpty>Nenhum veículo encontrado.</CommandEmpty>
                        <CommandGroup>
                          <CommandItem
                            value="nenhum-veiculo"
                            onSelect={() => {
                              field.onChange('');
                              setVehicleOpen(false);
                            }}
                          >
                            <Check className={cn("mr-2 h-4 w-4", !field.value ? "opacity-100" : "opacity-0")} />
                            Nenhum
                          </CommandItem>
                          {availableVehicles.map((vehicle) => (
                            <CommandItem
                              key={vehicle.id}
                              value={`${vehicle.brand} ${vehicle.model} ${vehicle.year_model} ${vehicle.plate || ''}`}
                              onSelect={() => {
                                field.onChange(vehicle.id);
                                setVehicleOpen(false);
                              }}
                            >
                              <Check className={cn("mr-2 h-4 w-4", field.value === vehicle.id ? "opacity-100" : "opacity-0")} />
                              <Car className="mr-2 h-4 w-4 text-muted-foreground" />
                              <div className="flex flex-col">
                                <span>{vehicle.brand} {vehicle.model} {vehicle.year_model}</span>
                                <span className="text-xs text-muted-foreground font-mono">
                                  {vehicle.plate || 'Sem placa'}
                                </span>
                              </div>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            );
          }}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="estimated_value"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Valor Estimado (R$)</FormLabel>
                <FormControl>
                  <Input type="number" placeholder="0,00" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="probability"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Probabilidade (%)</FormLabel>
                <FormControl>
                  <Input type="number" min="0" max="100" placeholder="50" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="status"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Status</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {([...pipelineColumns, 'pausado'] as NegotiationStatus[]).map((status) => (
                      <SelectItem key={status} value={status}>
                        {negotiationStatusLabels[status]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="expected_close_date"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Previsão de Fechamento</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Appointment Section */}
        <div className="p-4 bg-muted/50 rounded-lg space-y-4">
          <h4 className="font-medium flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Agendamento de Visita
          </h4>
          
          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="appointment_date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <Calendar className="h-3 w-3" />
                    Data
                  </FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="appointment_time"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <Clock className="h-3 w-3" />
                    Horário
                  </FormLabel>
                  <FormControl>
                    <Input type="time" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {watchAppointmentDate && (
            <FormField
              control={form.control}
              name="showed_up"
              render={({ field }) => (
                <FormItem className="flex items-center gap-3 space-y-0">
                  <FormControl>
                    <Checkbox 
                      checked={field.value ?? false} 
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <FormLabel className="flex items-center gap-2 cursor-pointer">
                    <UserCheck className="h-4 w-4" />
                    Cliente compareceu à visita
                  </FormLabel>
                </FormItem>
              )}
            />
          )}
        </div>

        {/* Objections Section */}
        <div className="p-4 bg-muted/50 rounded-lg space-y-3">
          <h4 className="font-medium">Objeções do Cliente</h4>
          <FormField
            control={form.control}
            name="objections"
            render={({ field }) => (
              <FormItem>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {objectionOptions.map((option) => (
                    <div key={option.value} className="flex items-center gap-2">
                      <Checkbox 
                        checked={field.value?.includes(option.value) ?? false}
                        onCheckedChange={(checked) => {
                          const current = field.value || [];
                          if (checked) {
                            field.onChange([...current, option.value]);
                          } else {
                            field.onChange(current.filter(v => v !== option.value));
                          }
                        }}
                      />
                      <span className="text-sm">{option.label}</span>
                    </div>
                  ))}
                </div>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {watchStatus === 'perdido' && (
          <div className="p-4 border border-destructive/30 bg-destructive/5 rounded-lg space-y-4">
            <h4 className="font-medium text-destructive">Motivo da Perda</h4>
            
            <FormField
              control={form.control}
              name="structured_loss_reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Categoria</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || ''}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o motivo" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {Object.entries(lossReasonLabels).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="loss_reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Detalhes</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Descreva os detalhes..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        )}

        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Observações</FormLabel>
              <FormControl>
                <Textarea placeholder="Anotações sobre a negociação..." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? 'Salvando...' : negotiation ? 'Atualizar' : 'Criar Negociação'}
        </Button>
      </form>
    </Form>
  );
}
