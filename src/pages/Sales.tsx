import { useState, useMemo } from 'react';
import { Plus, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useSales, useSaleProfitReports, useDeleteSale } from '@/hooks/useSales';
import { SaleCard } from '@/components/sales/SaleCard';
import { SaleForm } from '@/components/sales/SaleForm';
import { ProfitReportCard } from '@/components/sales/ProfitReportCard';
import { useAuth } from '@/contexts/AuthContext';
import { usePermissions } from '@/hooks/usePermissions';
import type { Sale } from '@/types/sales';

export default function Sales() {
  const [formOpen, setFormOpen] = useState(false);
  const [editingSale, setEditingSale] = useState<Sale | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const { data: sales, isLoading } = useSales();
  const { data: profitReports } = useSaleProfitReports();
  const deleteSale = useDeleteSale();
  const { role } = useAuth();

  const isManager = role === 'gerente';

  // Filter sales by search
  const filteredSales = useMemo(() => {
    if (!searchQuery.trim() || !sales) return sales;
    
    const query = searchQuery.toLowerCase();
    return sales.filter((sale) => {
      const customerName = sale.customer?.name?.toLowerCase() || '';
      const vehicleInfo = sale.vehicle ? `${sale.vehicle.brand} ${sale.vehicle.model}`.toLowerCase() : '';
      const salespersonName = sale.salesperson?.full_name?.toLowerCase() || '';
      
      return (
        customerName.includes(query) ||
        vehicleInfo.includes(query) ||
        salespersonName.includes(query)
      );
    });
  }, [sales, searchQuery]);

  const handleEdit = (sale: Sale) => {
    setEditingSale(sale);
    setFormOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir esta venda?')) {
      await deleteSale.mutateAsync(id);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Vendas</h1>
          <p className="text-muted-foreground">Gerencie vendas e visualize lucros</p>
        </div>
        {isManager && (
          <Button onClick={() => { setEditingSale(null); setFormOpen(true); }}>
            <Plus className="h-4 w-4 mr-2" /> Nova Venda
          </Button>
        )}
      </div>

      <Tabs defaultValue="sales">
        <TabsList>
          <TabsTrigger value="sales">Vendas</TabsTrigger>
          <TabsTrigger value="profit">Lucro Real</TabsTrigger>
        </TabsList>

        <TabsContent value="sales" className="mt-4 space-y-4">
          {/* Search Bar */}
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por cliente, veículo ou vendedor..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          {isLoading ? (
            <p>Carregando...</p>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredSales?.map((sale) => (
                <SaleCard
                  key={sale.id}
                  sale={sale}
                  onEdit={isManager ? handleEdit : undefined}
                  onDelete={isManager ? handleDelete : undefined}
                />
              ))}
              {filteredSales?.length === 0 && (
                <p className="text-muted-foreground col-span-full text-center py-8">
                  {searchQuery ? 'Nenhuma venda encontrada' : 'Nenhuma venda registrada'}
                </p>
              )}
            </div>
          )}
        </TabsContent>

        <TabsContent value="profit" className="mt-4">
          <div className="grid gap-4 md:grid-cols-2">
            {profitReports?.map((report) => (
              <ProfitReportCard key={report.id} report={report} />
            ))}
            {profitReports?.length === 0 && (
              <p className="text-muted-foreground col-span-full text-center py-8">
                Nenhum relatório de lucro disponível
              </p>
            )}
          </div>
        </TabsContent>
      </Tabs>

      <SaleForm open={formOpen} onOpenChange={setFormOpen} sale={editingSale} />
    </div>
  );
}
