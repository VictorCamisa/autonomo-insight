import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useSaleCommissions, useCommissionStats } from '@/hooks/useCommissionsComplete';
import { BentoCard } from '@/components/ui/bento-card';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { 
  Wallet, 
  Clock, 
  CheckCircle, 
  XCircle,
  DollarSign
} from 'lucide-react';
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer,
  Tooltip,
  Legend
} from 'recharts';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { parseDate } from '@/lib/utils';

export function FinancialCommissionsPage() {
  const { data: commissions, isLoading } = useSaleCommissions();
  const { data: stats } = useCommissionStats();

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const statusColors: Record<string, string> = {
    pending: 'hsl(var(--warning))',
    approved: 'hsl(142 76% 36%)',
    paid: 'hsl(var(--primary))',
    rejected: 'hsl(var(--destructive))',
  };

  const statusLabels: Record<string, string> = {
    pending: 'Pendente',
    approved: 'Aprovada',
    paid: 'Paga',
    rejected: 'Rejeitada',
  };

  const chartData = [
    { name: 'Pendentes', value: stats?.totalPending || 0, color: statusColors.pending },
    { name: 'Aprovadas', value: stats?.totalApproved || 0, color: statusColors.approved },
    { name: 'Pagas', value: stats?.totalPaid || 0, color: statusColors.paid },
    { name: 'Rejeitadas', value: stats?.totalRejected || 0, color: statusColors.rejected },
  ].filter(d => d.value > 0);

  const pendingCommissions = commissions?.filter(c => c.status === 'pending') || [];
  const approvedCommissions = commissions?.filter(c => c.status === 'approved') || [];
  const paidCommissions = commissions?.filter(c => c.status === 'paid') || [];

  if (isLoading) {
    return <div className="flex items-center justify-center h-64">Carregando...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Gestão de Comissões</h2>
        <p className="text-muted-foreground">Controle de comissões pendentes, aprovadas e pagas</p>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <BentoCard
          title="Pendentes"
          value={formatCurrency(stats?.totalPending || 0)}
          subtitle={`${stats?.countPending || 0} comissões`}
          colors={["#E53935", "#EF5350", "#E57373"]}
          delay={0}
          icon={<Clock className="h-5 w-5 text-primary" />}
        />
        <BentoCard
          title="Aprovadas (a pagar)"
          value={formatCurrency(stats?.totalApproved || 0)}
          subtitle={`${stats?.countApproved || 0} comissões`}
          colors={["#D32F2F", "#E53935", "#EF5350"]}
          delay={0.1}
          icon={<CheckCircle className="h-5 w-5 text-primary" />}
        />
        <BentoCard
          title="Pagas"
          value={formatCurrency(stats?.totalPaid || 0)}
          subtitle={`${stats?.countPaid || 0} comissões`}
          colors={["#C62828", "#D32F2F", "#E53935"]}
          delay={0.2}
          icon={<Wallet className="h-5 w-5 text-primary" />}
        />
        <BentoCard
          title="Total Geral"
          value={formatCurrency((stats?.totalPending || 0) + (stats?.totalApproved || 0) + (stats?.totalPaid || 0))}
          subtitle="Todas as comissões"
          colors={["#B71C1C", "#C62828", "#D32F2F"]}
          delay={0.3}
          icon={<DollarSign className="h-5 w-5 text-muted-foreground" />}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Distribuição por Status</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* A pagar */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              Comissões a Pagar
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="max-h-[300px] overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Vendedor</TableHead>
                    <TableHead>Vencimento</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {approvedCommissions.slice(0, 10).map((comm) => (
                    <TableRow key={comm.id}>
                      <TableCell className="font-medium">
                        {comm.user_id?.substring(0, 8)}...
                      </TableCell>
                      <TableCell>
                        {(() => {
                          const date = parseDate(comm.payment_due_date);
                          return date ? format(date, 'dd/MM/yyyy', { locale: ptBR }) : '-';
                        })()}
                      </TableCell>
                      <TableCell className="text-right font-semibold text-green-500">
                        {formatCurrency(comm.final_amount)}
                      </TableCell>
                    </TableRow>
                  ))}
                  {approvedCommissions.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center text-muted-foreground py-8">
                        Nenhuma comissão a pagar
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed List */}
      <Card>
        <CardHeader>
          <CardTitle>Todas as Comissões</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="pending">
            <TabsList>
              <TabsTrigger value="pending">Pendentes ({pendingCommissions.length})</TabsTrigger>
              <TabsTrigger value="approved">Aprovadas ({approvedCommissions.length})</TabsTrigger>
              <TabsTrigger value="paid">Pagas ({paidCommissions.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="pending" className="mt-4">
              <CommissionsTable commissions={pendingCommissions} formatCurrency={formatCurrency} statusLabels={statusLabels} />
            </TabsContent>
            <TabsContent value="approved" className="mt-4">
              <CommissionsTable commissions={approvedCommissions} formatCurrency={formatCurrency} statusLabels={statusLabels} />
            </TabsContent>
            <TabsContent value="paid" className="mt-4">
              <CommissionsTable commissions={paidCommissions} formatCurrency={formatCurrency} statusLabels={statusLabels} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

function CommissionsTable({ 
  commissions, 
  formatCurrency,
  statusLabels
}: { 
  commissions: any[];
  formatCurrency: (value: number) => string;
  statusLabels: Record<string, string>;
}) {
  return (
    <div className="max-h-[400px] overflow-y-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Data</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Calculado</TableHead>
            <TableHead className="text-right">Ajuste</TableHead>
            <TableHead className="text-right">Final</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {commissions.map((comm) => (
            <TableRow key={comm.id}>
              <TableCell>
                {(() => {
                  const date = parseDate(comm.created_at);
                  return date ? format(date, 'dd/MM/yyyy', { locale: ptBR }) : '-';
                })()}
              </TableCell>
              <TableCell>
                <Badge variant={
                  comm.status === 'approved' ? 'default' :
                  comm.status === 'paid' ? 'secondary' :
                  comm.status === 'rejected' ? 'destructive' : 'outline'
                }>
                  {statusLabels[comm.status] || comm.status}
                </Badge>
              </TableCell>
              <TableCell className="text-right">{formatCurrency(comm.calculated_amount)}</TableCell>
              <TableCell className="text-right text-muted-foreground">
                {comm.manual_adjustment ? formatCurrency(comm.manual_adjustment) : '-'}
              </TableCell>
              <TableCell className="text-right font-semibold">{formatCurrency(comm.final_amount)}</TableCell>
            </TableRow>
          ))}
          {commissions.length === 0 && (
            <TableRow>
              <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                Nenhuma comissão encontrada
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
