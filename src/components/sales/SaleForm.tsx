import { useState, useEffect, useCallback, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { useCreateSale, useUpdateSale } from '@/hooks/useSales';
import { useVehicles } from '@/hooks/useVehicles';
import { useCustomers } from '@/hooks/useCustomers';
import { saleStatusLabels, type Sale } from '@/types/sales';
import { PaymentMethodsSection, PaymentMethodEntry } from './PaymentMethodsSection';
import { CommissionSection } from './CommissionSection';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { AlertCircle, Trash2, Check, ChevronsUpDown, Car, User } from 'lucide-react';
import { useFormPersistence, useFormLeaveWarning } from '@/hooks/useFormPersistence';
import { cn } from '@/lib/utils';

const formSchema = z.object({
  customer_id: z.string().min(1, 'Selecione um cliente'),
  vehicle_id: z.string().min(1, 'Selecione um veículo'),
  sale_date: z.string().min(1, 'Data obrigatória'),
  sale_price: z.coerce.number().min(1, 'Valor obrigatório'),
  documentation_cost: z.coerce.number().optional(),
  transfer_cost: z.coerce.number().optional(),
  other_sale_costs: z.coerce.number().optional(),
  status: z.enum(['pendente', 'concluida', 'cancelada']),
  notes: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface SaleFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sale?: Sale | null;
}

export function SaleForm({ open, onOpenChange, sale }: SaleFormProps) {
  const createSale = useCreateSale();
  const updateSale = useUpdateSale();
  const { data: vehicles } = useVehicles();
  const { data: customers } = useCustomers();
  const isEditing = !!sale;
  const storageKey = isEditing ? `sale_edit_${sale.id}` : 'sale_create';
  
  // Fetch salespeople (users with vendedor role)
  const { data: salespeople } = useQuery({
    queryKey: ['salespeople-for-sale'],
    queryFn: async () => {
      const { data: roles } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'vendedor');
      
      if (!roles?.length) return [];
      
      const userIds = (roles as { user_id: string }[]).map(r => r.user_id);
      
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', userIds)
        .eq('is_active', true);
      
      return profiles || [];
    },
  });
  
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodEntry[]>([
    { id: crypto.randomUUID(), payment_method: 'pix', amount: 0 }
  ]);
  
  // Commission state
  const [salespersonId, setSalespersonId] = useState('');
  const [commissionRuleId, setCommissionRuleId] = useState<string | null>(null);
  const [manualAdjustment, setManualAdjustment] = useState(0);
  const [calculatedCommission, setCalculatedCommission] = useState(0);

  // Combobox state
  const [customerOpen, setCustomerOpen] = useState(false);
  const [vehicleOpen, setVehicleOpen] = useState(false);

  const availableVehicles = vehicles?.filter(v => v.status === 'disponivel' || v.id === sale?.vehicle_id);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      customer_id: sale?.customer_id || '',
      vehicle_id: sale?.vehicle_id || '',
      sale_date: sale?.sale_date || new Date().toISOString().split('T')[0],
      sale_price: sale?.sale_price || 0,
      documentation_cost: sale?.documentation_cost || 0,
      transfer_cost: sale?.transfer_cost || 0,
      other_sale_costs: sale?.other_sale_costs || 0,
      status: sale?.status || 'pendente',
      notes: sale?.notes || '',
    },
  });

  // Persistir formulário
  const { clearDraft, hasDraft, discardDraft } = useFormPersistence({
    form,
    key: storageKey,
  });

  // Alertar ao sair com alterações não salvas
  useFormLeaveWarning(form.formState.isDirty);

  const salePrice = form.watch('sale_price');
  const vehicleId = form.watch('vehicle_id');
  const showDraftAlert = hasDraft() && !isEditing;
  
  // Get selected vehicle purchase price for profit calculation
  const selectedVehicle = vehicles?.find(v => v.id === vehicleId);
  const purchasePrice = selectedVehicle?.purchase_price || 0;
  
  const paymentsTotal = paymentMethods.reduce((sum, p) => sum + (p.amount || 0), 0);
  const isPaymentBalanced = Math.abs(paymentsTotal - salePrice) < 0.01;

  const handleCalculatedCommissionChange = useCallback((value: number) => {
    setCalculatedCommission(value);
  }, []);

  const onSubmit = async (data: FormData) => {
    if (!isPaymentBalanced) {
      return;
    }
    
    const paymentMethod = paymentMethods.length === 1 
      ? paymentMethods[0].payment_method as 'dinheiro' | 'pix' | 'cartao_credito' | 'cartao_debito' | 'financiamento' | 'consorcio' | 'permuta' | 'misto'
      : 'misto' as const;
    
    const saleData = {
      ...data,
      payment_method: paymentMethod,
      payment_details: paymentMethods.length > 1 
        ? `Múltiplos pagamentos: ${paymentMethods.map(p => `${p.payment_method}: R$ ${p.amount}`).join(', ')}`
        : paymentMethods[0]?.details || '',
      salesperson_id: salespersonId,
    };

    if (sale) {
      await updateSale.mutateAsync({ id: sale.id, ...saleData });
    } else {
      await createSale.mutateAsync(saleData as any);
    }
    clearDraft();
    onOpenChange(false);
    form.reset();
  };

  const isLoading = createSale.isPending || updateSale.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{sale ? 'Editar Venda' : 'Nova Venda'}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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
            {/* Basic Info */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="customer_id"
                render={({ field }) => {
                  const selectedCustomer = customers?.find(c => c.id === field.value);
                  return (
                    <FormItem className="flex flex-col">
                      <FormLabel>Cliente *</FormLabel>
                      <Popover open={customerOpen} onOpenChange={setCustomerOpen}>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              role="combobox"
                              aria-expanded={customerOpen}
                              className={cn(
                                "w-full justify-between font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {selectedCustomer ? (
                                <span className="truncate">{selectedCustomer.name}</span>
                              ) : "Buscar cliente..."}
                              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-[350px] p-0" align="start">
                          <Command>
                            <CommandInput placeholder="Buscar por nome, telefone, CPF..." />
                            <CommandList>
                              <CommandEmpty>Nenhum cliente encontrado.</CommandEmpty>
                              <CommandGroup>
                                {customers?.map((c) => (
                                  <CommandItem
                                    key={c.id}
                                    value={`${c.name} ${c.phone} ${c.cpf_cnpj || ''} ${c.email || ''}`}
                                    onSelect={() => {
                                      field.onChange(c.id);
                                      setCustomerOpen(false);
                                    }}
                                  >
                                    <Check className={cn("mr-2 h-4 w-4", field.value === c.id ? "opacity-100" : "opacity-0")} />
                                    <div className="flex flex-col">
                                      <span>{c.name}</span>
                                      <span className="text-xs text-muted-foreground">{c.phone}{c.cpf_cnpj ? ` • ${c.cpf_cnpj}` : ''}</span>
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
                name="vehicle_id"
                render={({ field }) => {
                  const selectedVeh = availableVehicles?.find(v => v.id === field.value);
                  return (
                    <FormItem className="flex flex-col">
                      <FormLabel>Veículo *</FormLabel>
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
                              {selectedVeh ? (
                                <span className="truncate">{selectedVeh.brand} {selectedVeh.model} - {selectedVeh.plate || 'Sem placa'}</span>
                              ) : "Buscar veículo..."}
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
                                {availableVehicles?.map((v) => (
                                  <CommandItem
                                    key={v.id}
                                    value={`${v.brand} ${v.model} ${v.year_model} ${v.plate || ''}`}
                                    onSelect={() => {
                                      field.onChange(v.id);
                                      setVehicleOpen(false);
                                    }}
                                  >
                                    <Check className={cn("mr-2 h-4 w-4", field.value === v.id ? "opacity-100" : "opacity-0")} />
                                    <Car className="mr-2 h-4 w-4 text-muted-foreground" />
                                    <div className="flex flex-col">
                                      <span>{v.brand} {v.model} {v.year_model}</span>
                                      <span className="text-xs text-muted-foreground font-mono">{v.plate || 'Sem placa'}</span>
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
            </div>

            <div className="grid grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="sale_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Data da Venda *</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="sale_price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Valor Total da Venda *</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.entries(saleStatusLabels).map(([key, label]) => (
                          <SelectItem key={key} value={key}>{label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <Separator />
            
            {/* Payment Methods Section */}
            <PaymentMethodsSection
              paymentMethods={paymentMethods}
              onChange={setPaymentMethods}
              totalSalePrice={salePrice}
            />
            
            {!isPaymentBalanced && salePrice > 0 && (
              <p className="text-sm text-destructive">
                A soma dos pagamentos (R$ {paymentsTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}) 
                deve ser igual ao valor total da venda (R$ {salePrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })})
              </p>
            )}

            <Separator />

            {/* Commission Section */}
            <CommissionSection
              salespersonId={salespersonId}
              onSalespersonChange={setSalespersonId}
              salePrice={salePrice}
              purchasePrice={purchasePrice}
              commissionRuleId={commissionRuleId}
              onCommissionRuleChange={setCommissionRuleId}
              manualAdjustment={manualAdjustment}
              onManualAdjustmentChange={setManualAdjustment}
              calculatedCommission={calculatedCommission}
              onCalculatedCommissionChange={handleCalculatedCommissionChange}
              salespeople={salespeople || []}
            />

            <Separator />

            {/* Additional Costs */}
            <div>
              <h3 className="font-medium mb-3">Custos Adicionais</h3>
              <div className="grid grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="documentation_cost"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Documentação</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" placeholder="R$ 0,00" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="transfer_cost"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Transferência</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" placeholder="R$ 0,00" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="other_sale_costs"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Outros Custos</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" placeholder="R$ 0,00" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Observações</FormLabel>
                  <FormControl>
                    <Textarea rows={2} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isLoading || (!isPaymentBalanced && salePrice > 0)}>
                {isLoading ? 'Salvando...' : sale ? 'Atualizar' : 'Registrar Venda'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
