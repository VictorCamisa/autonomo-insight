import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { vehicleStatusLabels, fuelTypeLabels, transmissionLabels } from '@/types/inventory';
import type { Vehicle } from '@/types/inventory';
import { Car, DollarSign, Calculator, FileText, Globe, AlertCircle, Trash2 } from 'lucide-react';
import { useFormPersistence, useFormLeaveWarning } from '@/hooks/useFormPersistence';

const completeFormSchema = z.object({
  // Dados básicos
  brand: z.string().min(1, 'Marca é obrigatória').max(50),
  model: z.string().min(1, 'Modelo é obrigatório').max(100),
  version: z.string().max(100).optional(),
  year_fabrication: z.coerce.number().min(1900).max(2030),
  year_model: z.coerce.number().min(1900).max(2030),
  color: z.string().min(1, 'Cor é obrigatória').max(30),
  plate: z.string().max(10).optional(),
  renavam: z.string().max(20).optional(),
  chassis: z.string().max(30).optional(),
  km: z.coerce.number().min(0),
  fuel_type: z.string(),
  transmission: z.string(),
  doors: z.coerce.number().min(2).max(5).optional(),
  
  // Dados de aquisição
  purchase_price: z.coerce.number().min(0).optional(),
  purchase_date: z.string().optional(),
  purchase_source: z.string().max(100).optional(),
  fipe_price_at_purchase: z.coerce.number().min(0).optional(),
  
  // Preços e metas
  sale_price: z.coerce.number().min(0).optional(),
  minimum_price: z.coerce.number().min(0).optional(),
  expected_margin_percent: z.coerce.number().min(0).max(100).optional(),
  expected_sale_days: z.coerce.number().min(0).optional(),
  
  // Custos estimados
  estimated_maintenance: z.coerce.number().min(0).optional(),
  estimated_cleaning: z.coerce.number().min(0).optional(),
  estimated_documentation: z.coerce.number().min(0).optional(),
  estimated_other_costs: z.coerce.number().min(0).optional(),
  
  // Status e visibilidade
  status: z.enum(['disponivel', 'reservado', 'vendido', 'em_manutencao']).optional(),
  featured: z.boolean().optional(),
  notes: z.string().max(1000).optional(),
});

export type CompleteFormValues = z.infer<typeof completeFormSchema>;

interface VehicleFormCompleteProps {
  vehicle?: Vehicle;
  onSubmit: (data: CompleteFormValues) => void;
  isLoading?: boolean;
}

export function VehicleFormComplete({ vehicle, onSubmit, isLoading }: VehicleFormCompleteProps) {
  const currentYear = new Date().getFullYear();
  const isEditing = !!vehicle;
  const storageKey = isEditing ? `vehicle_edit_${vehicle.id}` : 'vehicle_create';
  
  const form = useForm<CompleteFormValues>({
    resolver: zodResolver(completeFormSchema),
    defaultValues: {
      brand: vehicle?.brand || '',
      model: vehicle?.model || '',
      version: vehicle?.version || '',
      year_fabrication: vehicle?.year_fabrication || currentYear,
      year_model: vehicle?.year_model || currentYear,
      color: vehicle?.color || '',
      plate: vehicle?.plate || '',
      renavam: vehicle?.renavam || '',
      chassis: vehicle?.chassis || '',
      km: vehicle?.km || 0,
      fuel_type: vehicle?.fuel_type || 'flex',
      transmission: vehicle?.transmission || 'manual',
      doors: vehicle?.doors || 4,
      purchase_price: vehicle?.purchase_price || undefined,
      purchase_date: vehicle?.purchase_date || '',
      purchase_source: vehicle?.purchase_source || '',
      fipe_price_at_purchase: vehicle?.fipe_price_at_purchase || undefined,
      sale_price: vehicle?.sale_price || undefined,
      minimum_price: vehicle?.minimum_price || undefined,
      expected_margin_percent: vehicle?.expected_margin_percent || undefined,
      expected_sale_days: vehicle?.expected_sale_days || undefined,
      estimated_maintenance: vehicle?.estimated_maintenance || undefined,
      estimated_cleaning: vehicle?.estimated_cleaning || undefined,
      estimated_documentation: vehicle?.estimated_documentation || undefined,
      estimated_other_costs: vehicle?.estimated_other_costs || undefined,
      status: vehicle?.status || 'disponivel',
      featured: vehicle?.featured ?? false,
      notes: vehicle?.notes || '',
    },
  });

  // Persistir formulário apenas para criação (não edição)
  const { clearDraft, hasDraft, discardDraft } = useFormPersistence({
    form,
    key: storageKey,
  });

  // Alertar ao sair com alterações não salvas
  useFormLeaveWarning(form.formState.isDirty);

  // Handler de submit que limpa o rascunho após sucesso
  const handleSubmit = (data: CompleteFormValues) => {
    onSubmit(data);
    clearDraft();
  };

  // Calcular custo total estimado
  const watchedValues = form.watch([
    'purchase_price',
    'estimated_maintenance',
    'estimated_cleaning',
    'estimated_documentation',
    'estimated_other_costs'
  ]);

  const totalEstimatedCost = watchedValues.reduce((sum, val) => sum + (Number(val) || 0), 0);
  const salePrice = form.watch('sale_price');
  const estimatedMargin = salePrice ? Number(salePrice) - totalEstimatedCost : 0;
  const estimatedMarginPercent = totalEstimatedCost > 0 ? (estimatedMargin / totalEstimatedCost) * 100 : 0;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const showDraftAlert = hasDraft() && !isEditing;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        {/* Alerta de rascunho recuperado */}
        {showDraftAlert && (
          <Alert className="border-amber-500/50 bg-amber-500/10">
            <AlertCircle className="h-4 w-4 text-amber-500" />
            <AlertDescription className="flex items-center justify-between">
              <span className="text-sm">
                Um rascunho foi recuperado. Os dados preenchidos anteriormente foram restaurados.
              </span>
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
        {/* Seção: Dados do Veículo */}
        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-center gap-2">
              <Car className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">Dados do Veículo</CardTitle>
            </div>
            <CardDescription>Informações básicas de identificação</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="brand"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Marca *</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: Honda" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="model"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Modelo *</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: Civic" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="version"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Versão</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: EXL 2.0" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-4 gap-4">
              <FormField
                control={form.control}
                name="year_fabrication"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ano Fab. *</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="year_model"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ano Mod. *</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="color"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cor *</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: Prata" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="doors"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Portas</FormLabel>
                    <FormControl>
                      <Input type="number" min={2} max={5} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="km"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Quilometragem *</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="0" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="plate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Placa</FormLabel>
                    <FormControl>
                      <Input placeholder="ABC-1234" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="fuel_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Combustível</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.entries(fuelTypeLabels).map(([value, label]) => (
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
                name="transmission"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Câmbio</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.entries(transmissionLabels).map(([value, label]) => (
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

              {vehicle && (
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
                          {Object.entries(vehicleStatusLabels).map(([value, label]) => (
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
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="renavam"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Renavam</FormLabel>
                    <FormControl>
                      <Input placeholder="00000000000" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="chassis"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Chassi</FormLabel>
                    <FormControl>
                      <Input placeholder="9BWZZZ377VT004251" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>

        {/* Seção: Aquisição */}
        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-green-600" />
              <CardTitle className="text-lg">Dados de Aquisição</CardTitle>
            </div>
            <CardDescription>Informações financeiras da compra</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="purchase_price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Valor de Compra (R$) *</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" placeholder="0,00" {...field} />
                    </FormControl>
                    <FormDescription>Valor pago pelo veículo</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="purchase_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Data de Compra</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="fipe_price_at_purchase"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Valor FIPE na Compra (R$)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" placeholder="0,00" {...field} />
                    </FormControl>
                    <FormDescription>Referência de mercado</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="purchase_source"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Origem da Compra</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: Particular, Leilão, Troca" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>

        {/* Seção: Custos Estimados */}
        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-center gap-2">
              <Calculator className="h-5 w-5 text-orange-600" />
              <CardTitle className="text-lg">Custos Estimados</CardTitle>
            </div>
            <CardDescription>Projeção de custos para análise de viabilidade</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="estimated_maintenance"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Manutenção (R$)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" placeholder="0,00" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="estimated_cleaning"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Limpeza/Preparação (R$)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" placeholder="0,00" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="estimated_documentation"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Documentação (R$)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" placeholder="0,00" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="estimated_other_costs"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Outros Custos (R$)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" placeholder="0,00" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Resumo de custos - Card Destacado */}
            <div className="bg-gradient-to-br from-primary/10 to-primary/5 border-2 border-primary/30 rounded-xl p-5 space-y-3">
              <div className="flex items-center gap-2 mb-3">
                <Calculator className="h-5 w-5 text-primary" />
                <span className="font-semibold text-primary">Resumo de Custo Total</span>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Valor de Compra:</span>
                  <span className="font-medium">{formatCurrency(Number(form.watch('purchase_price')) || 0)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">(+) Custos Estimados:</span>
                  <span className="font-medium">
                    {formatCurrency(
                      (Number(form.watch('estimated_maintenance')) || 0) +
                      (Number(form.watch('estimated_cleaning')) || 0) +
                      (Number(form.watch('estimated_documentation')) || 0) +
                      (Number(form.watch('estimated_other_costs')) || 0)
                    )}
                  </span>
                </div>
                <Separator className="my-2" />
                <div className="flex justify-between items-center">
                  <span className="font-bold text-lg">(=) CUSTO TOTAL:</span>
                  <span className="font-bold text-2xl text-primary">{formatCurrency(totalEstimatedCost)}</span>
                </div>
              </div>

              {salePrice && salePrice > 0 && (
                <div className="mt-4 pt-3 border-t border-primary/20">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Margem Estimada:</span>
                    <div className="text-right">
                      <span className={`font-bold text-lg ${estimatedMargin >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {formatCurrency(estimatedMargin)}
                      </span>
                      <span className={`ml-2 text-sm ${estimatedMargin >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        ({estimatedMarginPercent.toFixed(1)}%)
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Seção: Precificação */}
        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-blue-600" />
              <CardTitle className="text-lg">Precificação e Metas</CardTitle>
            </div>
            <CardDescription>Definição de preços e expectativas de venda</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="sale_price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Preço de Venda (R$)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" placeholder="0,00" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="minimum_price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Preço Mínimo (R$)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" placeholder="0,00" {...field} />
                    </FormControl>
                    <FormDescription>Limite para negociação</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="expected_margin_percent"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Margem Esperada (%)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.1" placeholder="15" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="expected_sale_days"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Dias Esperados p/ Venda</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="30" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>

        {/* Seção: Visibilidade no Site */}
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-2">
              <Globe className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">Visibilidade no Site</CardTitle>
            </div>
            <CardDescription>Controle se este veículo aparece no site público</CardDescription>
          </CardHeader>
          <CardContent>
            <FormField
              control={form.control}
              name="featured"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Exibir no Site</FormLabel>
                    <FormDescription>
                      Quando ativado, o veículo será exibido na página pública de estoque
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Seção: Observações */}
        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-muted-foreground" />
              <CardTitle className="text-lg">Observações</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Textarea
                      placeholder="Observações sobre o veículo, condições, histórico..."
                      className="min-h-[100px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <Button type="submit" className="w-full" size="lg" disabled={isLoading}>
          {isLoading ? 'Salvando...' : vehicle ? 'Atualizar Veículo' : 'Cadastrar Veículo'}
        </Button>
      </form>
    </Form>
  );
}
