import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useCashFlow, getDateRangeFromPeriod, CashFlowFilters } from '@/hooks/useFinancial';
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { BentoCard } from '@/components/ui/bento-card';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowUpCircle, ArrowDownCircle, Wallet, TrendingUp, CalendarIcon } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn, parseDate } from '@/lib/utils';

export function CashFlowPage() {
  const [periodType, setPeriodType] = useState('month');
  const [customStartDate, setCustomStartDate] = useState<Date>(startOfMonth(new Date()));
  const [customEndDate, setCustomEndDate] = useState<Date>(endOfMonth(new Date()));
  const [granularity, setGranularity] = useState<'daily' | 'weekly' | 'monthly'>('monthly');

  const filters: CashFlowFilters | undefined = periodType === 'custom' 
    ? { startDate: customStartDate, endDate: customEndDate, granularity }
    : periodType === 'all' 
    ? undefined 
    : { ...getDateRangeFromPeriod(periodType), granularity };

  const { cashFlowData, balanceData, summary } = useCashFlow(filters);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  // Group by month for chart
  const monthlyBalance = balanceData.reduce((acc, item) => {
    const date = parseDate(item.date);
    const month = date ? format(date, 'MMM/yy', { locale: ptBR }) : 'N/A';
    if (!acc[month]) {
      acc[month] = { month, entradas: 0, saidas: 0, saldo: 0 };
    }
    if (item.type === 'entrada') {
      acc[month].entradas += item.value;
    } else {
      acc[month].saidas += item.value;
    }
    acc[month].saldo = acc[month].entradas - acc[month].saidas;
    return acc;
  }, {} as Record<string, { month: string; entradas: number; saidas: number; saldo: number }>);

  const chartData = Object.values(monthlyBalance);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Fluxo de Caixa</h2>
          <p className="text-muted-foreground">Entradas, saídas e projeções financeiras</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-2">
          <Select value={periodType} onValueChange={setPeriodType}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Período" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="today">Hoje</SelectItem>
              <SelectItem value="week">Esta Semana</SelectItem>
              <SelectItem value="month">Este Mês</SelectItem>
              <SelectItem value="quarter">Este Trimestre</SelectItem>
              <SelectItem value="year">Este Ano</SelectItem>
              <SelectItem value="last30">Últimos 30 dias</SelectItem>
              <SelectItem value="last90">Últimos 90 dias</SelectItem>
              <SelectItem value="custom">Personalizado</SelectItem>
            </SelectContent>
          </Select>

          {periodType === 'custom' && (
            <>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-[140px] justify-start text-left font-normal")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(customStartDate, "dd/MM/yyyy")}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={customStartDate}
                    onSelect={(d) => d && setCustomStartDate(d)}
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
              <span className="text-muted-foreground">até</span>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-[140px] justify-start text-left font-normal")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(customEndDate, "dd/MM/yyyy")}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={customEndDate}
                    onSelect={(d) => d && setCustomEndDate(d)}
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </>
          )}
        </div>
      </div>

      {/* Summary KPIs */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <BentoCard title="Entradas Realizadas" value={formatCurrency(summary.totalEntradas)} subtitle="Vendas e receitas" colors={["#22c55e", "#16a34a", "#15803d"]} delay={0} icon={<ArrowUpCircle className="h-5 w-5 text-green-500" />} />
        <BentoCard title="Saídas Realizadas" value={formatCurrency(summary.totalSaidas)} subtitle="Custos e despesas" colors={["#ef4444", "#dc2626", "#b91c1c"]} delay={0.1} icon={<ArrowDownCircle className="h-5 w-5 text-red-500" />} />
        <BentoCard title="Saldo Realizado" value={formatCurrency(summary.saldoRealizado)} subtitle="Entradas - Saídas" colors={["#3b82f6", "#2563eb", "#1d4ed8"]} delay={0.2} icon={<Wallet className="h-5 w-5 text-blue-500" />} />
        <BentoCard title="Projeção Saídas" value={formatCurrency(summary.projecaoSaidas)} subtitle="Comissões a pagar" colors={["#f59e0b", "#d97706", "#b45309"]} delay={0.3} icon={<TrendingUp className="h-5 w-5 text-amber-500" />} />
      </div>

      {/* Balance Chart */}
      <Card>
        <CardHeader><CardTitle>Evolução Mensal</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="month" className="text-xs" />
              <YAxis className="text-xs" tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} />
              <Tooltip formatter={(value: number) => formatCurrency(value)} contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
              <Area type="monotone" dataKey="entradas" name="Entradas" stroke="hsl(142 76% 36%)" fill="hsl(142 76% 36% / 0.5)" />
              <Area type="monotone" dataKey="saidas" name="Saídas" stroke="hsl(var(--destructive))" fill="hsl(var(--destructive) / 0.5)" />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Transactions Table */}
      <Card>
        <CardHeader><CardTitle>Movimentações ({cashFlowData.length})</CardTitle></CardHeader>
        <CardContent>
          <Tabs defaultValue="all">
            <TabsList>
              <TabsTrigger value="all">Todas</TabsTrigger>
              <TabsTrigger value="entradas">Entradas</TabsTrigger>
              <TabsTrigger value="saidas">Saídas</TabsTrigger>
              <TabsTrigger value="previstos">Previstos</TabsTrigger>
            </TabsList>
            <TabsContent value="all" className="mt-4"><TransactionsTable data={cashFlowData} formatCurrency={formatCurrency} /></TabsContent>
            <TabsContent value="entradas" className="mt-4"><TransactionsTable data={cashFlowData.filter(i => i.type === 'entrada')} formatCurrency={formatCurrency} /></TabsContent>
            <TabsContent value="saidas" className="mt-4"><TransactionsTable data={cashFlowData.filter(i => i.type === 'saida')} formatCurrency={formatCurrency} /></TabsContent>
            <TabsContent value="previstos" className="mt-4"><TransactionsTable data={cashFlowData.filter(i => i.status === 'previsto')} formatCurrency={formatCurrency} /></TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

function TransactionsTable({ data, formatCurrency }: { data: ReturnType<typeof useCashFlow>['cashFlowData']; formatCurrency: (value: number) => string; }) {
  return (
    <div className="max-h-[400px] overflow-y-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Data</TableHead>
            <TableHead>Descrição</TableHead>
            <TableHead>Categoria</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Valor</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.slice(0, 100).map((item) => {
            const date = parseDate(item.date);
            return (
            <TableRow key={item.id}>
              <TableCell className="whitespace-nowrap">{date ? format(date, 'dd/MM/yyyy', { locale: ptBR }) : '-'}</TableCell>
              <TableCell>{item.description}</TableCell>
              <TableCell><Badge variant="outline">{item.category}</Badge></TableCell>
              <TableCell><Badge variant={item.status === 'realizado' ? 'default' : 'secondary'}>{item.status === 'realizado' ? 'Realizado' : 'Previsto'}</Badge></TableCell>
              <TableCell className={`text-right font-semibold ${item.type === 'entrada' ? 'text-green-500' : 'text-red-500'}`}>{item.type === 'entrada' ? '+' : '-'}{formatCurrency(item.value)}</TableCell>
            </TableRow>
            );})}
          {data.length === 0 && (<TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">Nenhuma movimentação encontrada</TableCell></TableRow>)}
        </TableBody>
      </Table>
    </div>
  );
}
