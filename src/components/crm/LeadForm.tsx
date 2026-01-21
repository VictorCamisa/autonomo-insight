import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { leadSourceLabels, leadStatusLabels, qualificationStatusLabels } from '@/types/crm';
import type { Lead, LeadSource, LeadStatus, QualificationStatus } from '@/types/crm';
import { useMetaCampaigns } from '@/hooks/useMetaAds';
import { useUsersWithRoles } from '@/hooks/useUsers';
import { useVehicles } from '@/hooks/useVehicles';
import { Megaphone, User, AlertCircle, Trash2, Car, Check, ChevronsUpDown } from 'lucide-react';
import { useFormPersistence, useFormLeaveWarning } from '@/hooks/useFormPersistence';
import { cn } from '@/lib/utils';

const leadFormSchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres').max(100),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  phone: z.string().min(10, 'Telefone inválido').max(20),
  source: z.enum(['website', 'indicacao', 'facebook', 'instagram', 'google_ads', 'olx', 'webmotors', 'outros']),
  status: z.enum(['novo', 'contato_inicial', 'qualificado', 'proposta', 'negociacao', 'convertido', 'perdido']).optional(),
  notes: z.string().max(1000).optional(),
  vehicle_interest: z.string().max(200).optional(),
  meta_campaign_id: z.string().optional(),
  qualification_status: z.enum(['nao_qualificado', 'qualificado', 'desqualificado']).optional(),
  qualification_reason: z.string().max(500).optional(),
  assigned_to: z.string().min(1, 'Selecione um vendedor'),
});

type LeadFormValues = z.infer<typeof leadFormSchema>;

interface LeadFormProps {
  lead?: Lead;
  onSubmit: (data: LeadFormValues) => void;
  isLoading?: boolean;
}

export function LeadForm({ lead, onSubmit, isLoading }: LeadFormProps) {
  const { data: campaigns = [] } = useMetaCampaigns();
  const { data: users = [] } = useUsersWithRoles();
  const { data: vehicles = [] } = useVehicles();
  const [vehicleOpen, setVehicleOpen] = useState(false);
  
  const isEditing = !!lead;
  const storageKey = isEditing ? `lead_edit_${lead.id}` : 'lead_create';
  
  // Filter available vehicles
  const availableVehicles = vehicles.filter(v => v.status === 'disponivel');
  
  // Filter to only show active users with vendedor or gerente role
  const salespeople = users.filter(u => 
    u.is_active && (u.roles.includes('vendedor') || u.roles.includes('gerente'))
  );
  
  const form = useForm<LeadFormValues>({
    resolver: zodResolver(leadFormSchema),
    defaultValues: {
      name: lead?.name || '',
      email: lead?.email || '',
      phone: lead?.phone || '',
      source: lead?.source || 'outros',
      status: lead?.status || 'novo',
      notes: lead?.notes || '',
      vehicle_interest: lead?.vehicle_interest || '',
      meta_campaign_id: lead?.meta_campaign_id || '',
      qualification_status: lead?.qualification_status || 'nao_qualificado',
      qualification_reason: lead?.qualification_reason || '',
      assigned_to: lead?.assigned_to || '',
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
  const handleSubmit = (data: LeadFormValues) => {
    onSubmit(data);
    clearDraft();
  };

  const watchSource = form.watch('source');
  const showCampaignField = ['facebook', 'instagram', 'google_ads'].includes(watchSource);
  const showDraftAlert = hasDraft() && !isEditing;

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
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nome *</FormLabel>
              <FormControl>
                <Input placeholder="Nome do lead" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Telefone *</FormLabel>
                <FormControl>
                  <Input placeholder="(00) 00000-0000" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input placeholder="email@exemplo.com" type="email" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="source"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Origem *</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a origem" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {Object.entries(leadSourceLabels).map(([value, label]) => (
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
            name="assigned_to"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Vendedor Responsável *
                </FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
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
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {lead && (
          <FormField
            control={form.control}
            name="status"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Status</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o status" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {Object.entries(leadStatusLabels).map(([value, label]) => (
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
        )}

        {showCampaignField && (
          <FormField
            control={form.control}
            name="meta_campaign_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center gap-2">
                  <Megaphone className="h-4 w-4" />
                  Campanha de Origem
                </FormLabel>
                <Select 
                  onValueChange={(val) => field.onChange(val === "none" ? "" : val)} 
                  value={field.value || "none"}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a campanha (opcional)" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="none">Nenhuma</SelectItem>
                    {campaigns.map((campaign) => (
                      <SelectItem key={campaign.id} value={campaign.id}>
                        {campaign.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        {lead && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
            <FormField
              control={form.control}
              name="qualification_status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Qualificação</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || 'nao_qualificado'}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {Object.entries(qualificationStatusLabels).map(([value, label]) => (
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
              name="qualification_reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Motivo da Qualificação</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Tem entrada, crédito aprovado..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        )}

        <FormField
          control={form.control}
          name="vehicle_interest"
          render={({ field }) => {
            const selectedVehicle = availableVehicles.find((v) => v.id === field.value);
            return (
              <FormItem className="flex flex-col">
                <FormLabel>Interesse em veículo</FormLabel>
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
                          : field.value || "Selecione ou digite o interesse"}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-[400px] p-0" align="start">
                    <Command>
                      <CommandInput 
                        placeholder="Buscar por marca, modelo ou placa..." 
                        onValueChange={(search) => {
                          // Allow typing custom text if no vehicle matches
                          if (search && !availableVehicles.some(v => 
                            `${v.brand} ${v.model} ${v.year_model} ${v.plate || ''}`.toLowerCase().includes(search.toLowerCase())
                          )) {
                            field.onChange(search);
                          }
                        }}
                      />
                      <CommandList>
                        <CommandEmpty>
                          <div className="p-2 text-sm text-muted-foreground">
                            Nenhum veículo encontrado. O texto digitado será salvo.
                          </div>
                        </CommandEmpty>
                        <CommandGroup heading="Veículos disponíveis">
                          <CommandItem
                            value="nenhum-interesse"
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

        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Observações</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="Anotações sobre o lead..." 
                  className="min-h-[100px]"
                  {...field} 
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? 'Salvando...' : lead ? 'Atualizar Lead' : 'Criar Lead'}
        </Button>
      </form>
    </Form>
  );
}
