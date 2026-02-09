import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { vehicleCostTypeLabels } from '@/types/inventory';
import type { VehicleCostType } from '@/types/inventory';
import { useEffect } from 'react';

const costFormSchema = z.object({
  cost_type: z.enum(['aquisicao', 'documentacao', 'transferencia', 'ipva', 'manutencao', 'limpeza', 'frete', 'comissao_compra', 'outros']),
  description: z.string().min(1, 'Descrição é obrigatória').max(200),
  amount: z.coerce.number().min(0.01, 'Valor deve ser maior que zero'),
  cost_date: z.string().optional(),
});

type CostFormValues = z.infer<typeof costFormSchema>;

export interface VehicleCostEditData {
  id: string;
  cost_type: VehicleCostType;
  description: string;
  amount: number;
  cost_date?: string | null;
}

interface VehicleCostFormProps {
  onSubmit: (data: CostFormValues & { vehicle_id: string }) => void;
  vehicleId: string;
  isLoading?: boolean;
  editingCost?: VehicleCostEditData | null;
  onCancelEdit?: () => void;
}

export function VehicleCostForm({ onSubmit, vehicleId, isLoading, editingCost, onCancelEdit }: VehicleCostFormProps) {
  const form = useForm<CostFormValues>({
    resolver: zodResolver(costFormSchema),
    defaultValues: {
      cost_type: 'manutencao',
      description: '',
      amount: undefined,
      cost_date: new Date().toISOString().split('T')[0],
    },
  });

  useEffect(() => {
    if (editingCost) {
      form.reset({
        cost_type: editingCost.cost_type,
        description: editingCost.description,
        amount: editingCost.amount,
        cost_date: editingCost.cost_date?.split('T')[0] || new Date().toISOString().split('T')[0],
      });
    }
  }, [editingCost, form]);

  const handleSubmit = (data: CostFormValues) => {
    onSubmit({ ...data, vehicle_id: vehicleId });
    form.reset({
      cost_type: 'manutencao',
      description: '',
      amount: undefined,
      cost_date: new Date().toISOString().split('T')[0],
    });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="cost_type"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Tipo de Custo *</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {Object.entries(vehicleCostTypeLabels).map(([value, label]) => (
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
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Descrição *</FormLabel>
              <FormControl>
                <Input placeholder="Ex: Troca de óleo e filtros" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="amount"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Valor (R$) *</FormLabel>
                <FormControl>
                  <Input type="number" step="0.01" placeholder="0,00" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="cost_date"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Data</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="flex gap-2">
          <Button type="submit" className="flex-1" disabled={isLoading}>
            {isLoading ? (editingCost ? 'Salvando...' : 'Adicionando...') : (editingCost ? 'Salvar Alterações' : 'Adicionar Custo')}
          </Button>
          {editingCost && onCancelEdit && (
            <Button type="button" variant="outline" onClick={onCancelEdit}>
              Cancelar
            </Button>
          )}
        </div>
      </form>
    </Form>
  );
}
