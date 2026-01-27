import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  ArrowUpCircle,
  ArrowDownCircle,
  Filter,
  Search,
  MoreHorizontal,
  Check,
  Trash2,
  Calendar,
  TrendingUp,
  TrendingDown,
  Wallet,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TransactionForm } from './TransactionForm';
import {
  useFinancialTransactions,
  useFinancialCategories,
  useMarkAsPaid,
  useDeleteTransaction,
  useFinancialSummary,
} from '@/hooks/useFinancialTransactions';
import { cn, parseDate } from '@/lib/utils';

const statusLabels = {
  pendente: 'Pendente',
  pago: 'Pago',
  cancelado: 'Cancelado',
};

const statusColors = {
  pendente: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20',
  pago: 'bg-green-500/10 text-green-600 border-green-500/20',
  cancelado: 'bg-red-500/10 text-red-600 border-red-500/20',
};

export function TransactionsPage() {
  const [typeFilter, setTypeFilter] = useState<'all' | 'receita' | 'despesa'>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [search, setSearch] = useState('');

  const { data: transactions, isLoading } = useFinancialTransactions(
    typeFilter !== 'all' ? { type: typeFilter } : undefined
  );
  const { data: categories } = useFinancialCategories();
  const summary = useFinancialSummary();
  const markAsPaid = useMarkAsPaid();
  const deleteTransaction = useDeleteTransaction();

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const filteredTransactions = useMemo(() => {
    if (!transactions) return [];
    
    return transactions.filter((t) => {
      if (statusFilter !== 'all' && t.status !== statusFilter) return false;
      if (categoryFilter !== 'all' && t.category !== categoryFilter) return false;
      if (search) {
        const searchLower = search.toLowerCase();
        return (
          t.description.toLowerCase().includes(searchLower) ||
          t.category.toLowerCase().includes(searchLower)
        );
      }
      return true;
    });
  }, [transactions, statusFilter, categoryFilter, search]);

  const uniqueCategories = useMemo(() => {
    if (!transactions) return [];
    return [...new Set(transactions.map((t) => t.category))];
  }, [transactions]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Lançamentos Financeiros</h2>
          <p className="text-muted-foreground">Gerencie suas receitas e despesas</p>
        </div>
        <TransactionForm />
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Receitas
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(summary.totalReceitas)}
            </div>
            <p className="text-xs text-muted-foreground">
              {formatCurrency(summary.receitasPendentes)} pendente
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Despesas
            </CardTitle>
            <TrendingDown className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {formatCurrency(summary.totalDespesas)}
            </div>
            <p className="text-xs text-muted-foreground">
              {formatCurrency(summary.despesasPendentes)} pendente
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Saldo
            </CardTitle>
            <Wallet className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className={cn(
              'text-2xl font-bold',
              summary.saldo >= 0 ? 'text-green-600' : 'text-red-600'
            )}>
              {formatCurrency(summary.saldo)}
            </div>
            <p className="text-xs text-muted-foreground">
              Receitas - Despesas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Lançamentos
            </CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {transactions?.length || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              {transactions?.filter(t => t.status === 'pendente').length || 0} pendentes
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <Tabs value={typeFilter} onValueChange={(v) => setTypeFilter(v as any)} className="w-full sm:w-auto">
              <TabsList>
                <TabsTrigger value="all">Todos</TabsTrigger>
                <TabsTrigger value="receita" className="gap-2">
                  <ArrowUpCircle className="h-4 w-4 text-green-500" />
                  Receitas
                </TabsTrigger>
                <TabsTrigger value="despesa" className="gap-2">
                  <ArrowDownCircle className="h-4 w-4 text-red-500" />
                  Despesas
                </TabsTrigger>
              </TabsList>
            </Tabs>

            <div className="flex flex-1 gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Buscar lançamentos..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="pendente">Pendente</SelectItem>
                  <SelectItem value="pago">Pago</SelectItem>
                  <SelectItem value="cancelado">Cancelado</SelectItem>
                </SelectContent>
              </Select>

              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Categoria" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  {uniqueCategories.map((cat) => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Transactions Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tipo</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[60px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    Carregando...
                  </TableCell>
                </TableRow>
              ) : filteredTransactions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    Nenhum lançamento encontrado
                  </TableCell>
                </TableRow>
              ) : (
                filteredTransactions.map((transaction) => (
                  <TableRow key={transaction.id}>
                    <TableCell>
                      {transaction.type === 'receita' ? (
                        <ArrowUpCircle className="h-5 w-5 text-green-500" />
                      ) : (
                        <ArrowDownCircle className="h-5 w-5 text-red-500" />
                      )}
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{transaction.description}</p>
                        {transaction.notes && (
                          <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                            {transaction.notes}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{transaction.category}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {(() => {
                        const date = parseDate(transaction.transaction_date);
                        return date ? format(date, 'dd/MM/yyyy', { locale: ptBR }) : '-';
                      })()}
                    </TableCell>
                    <TableCell>
                      <span className={cn(
                        'font-semibold',
                        transaction.type === 'receita' ? 'text-green-600' : 'text-red-600'
                      )}>
                        {transaction.type === 'receita' ? '+' : '-'}
                        {formatCurrency(Number(transaction.amount))}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge className={statusColors[transaction.status]} variant="outline">
                        {statusLabels[transaction.status]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {transaction.status === 'pendente' && (
                            <DropdownMenuItem
                              onClick={() => markAsPaid.mutate(transaction.id)}
                              className="text-green-600"
                            >
                              <Check className="h-4 w-4 mr-2" />
                              Marcar como pago
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem
                            onClick={() => deleteTransaction.mutate(transaction.id)}
                            className="text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
