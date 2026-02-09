import { useState, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format } from 'date-fns';
import { CalendarIcon, Plus, Loader2, Repeat, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn, parseDate } from '@/lib/utils';
import { useFinancialCategories, useFinancialTransactions, useCreateTransaction, useUpdateTransaction, FinancialTransaction } from '@/hooks/useFinancialTransactions';

const formSchema = z.object({
  type: z.enum(['receita', 'despesa']),
  category: z.string().min(1, 'Categoria é obrigatória'),
  description: z.string().min(1, 'Descrição é obrigatória'),
  amount: z.coerce.number().positive('Valor deve ser maior que zero'),
  transaction_date: z.date(),
  due_date: z.date().optional(),
  status: z.enum(['pendente', 'pago', 'cancelado']),
  payment_method: z.string().optional(),
  recurrence: z.enum(['unica', 'semanal', 'mensal', 'anual']),
  recurrence_end_date: z.date().optional(),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface TransactionFormProps {
  onSuccess?: () => void;
  defaultType?: 'receita' | 'despesa';
  trigger?: React.ReactNode;
  transaction?: FinancialTransaction;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function TransactionForm({ onSuccess, defaultType = 'despesa', trigger, transaction, open: controlledOpen, onOpenChange }: TransactionFormProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setOpen = onOpenChange || setInternalOpen;

  const isEditing = !!transaction;
  const [type, setType] = useState<'receita' | 'despesa'>(transaction?.type || defaultType);
  const { data: categories } = useFinancialCategories(type);
  const { data: allTransactions } = useFinancialTransactions();
  const createTransaction = useCreateTransaction();
  const updateTransaction = useUpdateTransaction();

  // Merge predefined categories with categories already used in transactions
  const mergedCategories = useMemo(() => {
    const catNames = new Set(categories?.map(c => c.name) || []);
    const extraCats: { id: string; name: string }[] = [];
    allTransactions?.forEach(t => {
      if (t.category && !catNames.has(t.category)) {
        catNames.add(t.category);
        extraCats.push({ id: `extra-${t.category}`, name: t.category });
      }
    });
    const base = (categories || []).map(c => ({ id: c.id, name: c.name }));
    return [...base, ...extraCats].sort((a, b) => a.name.localeCompare(b.name));
  }, [categories, allTransactions]);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      type: transaction?.type || defaultType,
      category: transaction?.category || '',
      description: transaction?.description || '',
      amount: transaction?.amount || undefined,
      transaction_date: transaction?.transaction_date ? parseDate(transaction.transaction_date) || new Date() : new Date(),
      due_date: transaction?.due_date ? parseDate(transaction.due_date) || undefined : undefined,
      status: transaction?.status || 'pendente',
      recurrence: (transaction?.recurrence as any) || 'unica',
      recurrence_end_date: transaction?.recurrence_end_date ? parseDate(transaction.recurrence_end_date) || undefined : undefined,
      notes: transaction?.notes || '',
      payment_method: transaction?.payment_method || undefined,
    },
  });

  useEffect(() => {
    if (transaction && open) {
      setType(transaction.type);
      form.reset({
        type: transaction.type,
        category: transaction.category,
        description: transaction.description,
        amount: transaction.amount,
        transaction_date: parseDate(transaction.transaction_date) || new Date(),
        due_date: transaction.due_date ? parseDate(transaction.due_date) || undefined : undefined,
        status: transaction.status,
        recurrence: (transaction.recurrence as any) || 'unica',
        recurrence_end_date: transaction.recurrence_end_date ? parseDate(transaction.recurrence_end_date) || undefined : undefined,
        notes: transaction.notes || '',
        payment_method: transaction.payment_method || undefined,
      });
    }
  }, [transaction, open]);

  const onSubmit = async (values: FormValues) => {
    const payload = {
      type: values.type,
      category: values.category,
      description: values.description,
      amount: values.amount,
      transaction_date: format(values.transaction_date, 'yyyy-MM-dd'),
      due_date: values.due_date ? format(values.due_date, 'yyyy-MM-dd') : undefined,
      status: values.status,
      payment_method: values.payment_method,
      recurrence: values.recurrence,
      recurrence_end_date: values.recurrence_end_date ? format(values.recurrence_end_date, 'yyyy-MM-dd') : undefined,
      notes: values.notes,
    };

    if (isEditing) {
      await updateTransaction.mutateAsync({ id: transaction.id, ...payload });
    } else {
      await createTransaction.mutateAsync(payload);
    }
    form.reset();
    setOpen(false);
    onSuccess?.();
  };

  const isPending = isEditing ? updateTransaction.isPending : createTransaction.isPending;

  const handleTypeChange = (newType: 'receita' | 'despesa') => {
    setType(newType);
    form.setValue('type', newType);
    form.setValue('category', '');
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {!controlledOpen && (
        <DialogTrigger asChild>
          {trigger || (
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Novo Lançamento
            </Button>
          )}
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar Lançamento' : 'Novo Lançamento Financeiro'}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="flex gap-2 p-1 bg-muted rounded-lg">
              <Button
                type="button"
                variant={type === 'despesa' ? 'default' : 'ghost'}
                className={cn('flex-1', type === 'despesa' && 'bg-red-600 hover:bg-red-700')}
                onClick={() => handleTypeChange('despesa')}
              >
                Despesa
              </Button>
              <Button
                type="button"
                variant={type === 'receita' ? 'default' : 'ghost'}
                className={cn('flex-1', type === 'receita' && 'bg-green-600 hover:bg-green-700')}
                onClick={() => handleTypeChange('receita')}
              >
                Receita
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Categoria</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {mergedCategories.map((cat) => (
                          <SelectItem key={cat.id} value={cat.name}>{cat.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Valor (R$)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" placeholder="0,00" {...field} />
                    </FormControl>
                    <FormMessage />
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
                    <Input placeholder="Ex: Aluguel mês de janeiro" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="transaction_date"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Data</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button variant="outline" className={cn('justify-start text-left font-normal', !field.value && 'text-muted-foreground')}>
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {field.value ? format(field.value, 'dd/MM/yyyy') : 'Selecione'}
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus />
                      </PopoverContent>
                    </Popover>
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
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="pendente">Pendente</SelectItem>
                        <SelectItem value="pago">Pago</SelectItem>
                        <SelectItem value="cancelado">Cancelado</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="recurrence"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <Repeat className="h-4 w-4" />
                      Recorrência
                    </FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="unica">Única</SelectItem>
                        <SelectItem value="semanal">Semanal</SelectItem>
                        <SelectItem value="mensal">Mensal</SelectItem>
                        <SelectItem value="anual">Anual</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {form.watch('recurrence') !== 'unica' && (
                <FormField
                  control={form.control}
                  name="recurrence_end_date"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Fim da Recorrência</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button variant="outline" className={cn('justify-start text-left font-normal', !field.value && 'text-muted-foreground')}>
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {field.value ? format(field.value, 'dd/MM/yyyy') : 'Opcional'}
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Observações</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Anotações adicionais..." className="resize-none" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={isPending}>
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEditing ? 'Atualizar' : 'Salvar'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
