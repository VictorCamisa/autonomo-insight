import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Form,
  FormControl,
  FormDescription,
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
import { vehicleStatusLabels, fuelTypeLabels, transmissionLabels } from '@/types/inventory';
import type { Vehicle } from '@/types/inventory';

const vehicleFormSchema = z.object({
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
  
  // Status, visibilidade e notas
  status: z.enum(['disponivel', 'reservado', 'vendido', 'em_manutencao']).optional(),
  featured: z.boolean().optional(),
  notes: z.string().max(1000).optional(),
});

type VehicleFormValues = z.infer<typeof vehicleFormSchema>;

interface VehicleFormProps {
  vehicle?: Vehicle;
  onSubmit: (data: VehicleFormValues) => void;
  isLoading?: boolean;
  mode?: 'simple' | 'complete';
}

export function VehicleForm({ vehicle, onSubmit, isLoading, mode = 'simple' }: VehicleFormProps) {
  const currentYear = new Date().getFullYear();
  
  const form = useForm<VehicleFormValues>({
    resolver: zodResolver(vehicleFormSchema),
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

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <Tabs defaultValue="basic" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="basic">Veículo</TabsTrigger>
            <TabsTrigger value="financial">Aquisição</TabsTrigger>
            <TabsTrigger value="pricing">Precificação</TabsTrigger>
            <TabsTrigger value="notes">Observações</TabsTrigger>
          </TabsList>
          
          <TabsContent value="basic" className="space-y-4 mt-4">
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

            <div className="grid grid-cols-3 gap-4">
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

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="renavam"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>RENAVAM</FormLabel>
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

            {vehicle && (
              <>
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

                <FormField
                  control={form.control}
                  name="featured"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Visível no Site</FormLabel>
                        <FormDescription>
                          Quando ativado, o veículo aparecerá no site público
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
              </>
            )}
          </TabsContent>

          <TabsContent value="financial" className="space-y-4 mt-4">
            <p className="text-sm text-muted-foreground mb-4">
              Informações sobre a aquisição do veículo
            </p>
            
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="purchase_price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Valor de Compra (R$)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" placeholder="0,00" {...field} />
                    </FormControl>
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
                      <Input placeholder="Ex: Particular, Leilão" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </TabsContent>

          <TabsContent value="pricing" className="space-y-4 mt-4">
            <p className="text-sm text-muted-foreground mb-4">
              Preços de venda e estimativas de custos
            </p>
            
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

            <div className="border-t pt-4 mt-4">
              <p className="text-sm font-medium mb-3">Custos Estimados</p>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="estimated_maintenance"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Manutenção Estimada (R$)</FormLabel>
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
                      <FormLabel>Limpeza Estimada (R$)</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" placeholder="0,00" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4 mt-4">
                <FormField
                  control={form.control}
                  name="estimated_documentation"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Documentação Estimada (R$)</FormLabel>
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
                      <FormLabel>Outros Custos Estimados (R$)</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" placeholder="0,00" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="notes" className="space-y-4 mt-4">
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Observações</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Anotações sobre o veículo, histórico, detalhes importantes..." 
                      className="min-h-[200px]"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </TabsContent>
        </Tabs>

        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? 'Salvando...' : vehicle ? 'Atualizar Veículo' : 'Cadastrar Veículo'}
        </Button>
      </form>
    </Form>
  );
}
